const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jobRouter = require('../../api/rest/job.rest');
const getModel = require('../../db/model');

let mongoServer;
let jobModel;

const mockAuthMiddleware = (userId) => (req, res, next) => {
  req.authInfo = { userId, email: 'test@example.com' };
  next();
};

describe('Job REST API - Rate Limiting', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    jobModel = getModel('job');
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await jobModel.deleteMany({});
  });

  test('should create job successfully', async () => {
    const app = express();
    app.use(express.json());
    app.use(mockAuthMiddleware('user-123'));
    app.use('/job', jobRouter);

    const response = await request(app)
      .post('/job/create')
      .send({ name: 'Test Job' })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.job.name).toBe('Test Job');
  });

  test('should return 429 when rate limit exceeded', async () => {
    const app = express();
    app.use(express.json());
    app.use(mockAuthMiddleware('user-123'));
    app.use('/job', jobRouter);

    // Create 5 jobs first
    await jobModel.create([
      { ownerId: 'user-123', status: 'pending', name: 'job1' },
      { ownerId: 'user-123', status: 'running', name: 'job2' },
      { ownerId: 'user-123', status: 'pending', name: 'job3' },
      { ownerId: 'user-123', status: 'running', name: 'job4' },
      { ownerId: 'user-123', status: 'pending', name: 'job5' },
    ]);

    const response = await request(app)
      .post('/job/create')
      .send({ name: 'Job 6' })
      .expect(429);

    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain('Rate limit exceeded');
  });

  test('should create 5 jobs then reject 6th', async () => {
    const app = express();
    app.use(express.json());
    app.use(mockAuthMiddleware('user-123'));
    app.use('/job', jobRouter);

    // Create 5 jobs successfully
    for (let i = 1; i <= 5; i++) {
      await request(app)
        .post('/job/create')
        .send({ name: `Job ${i}` })
        .expect(201);
    }

    // 6th should fail
    await request(app)
      .post('/job/create')
      .send({ name: 'Job 6' })
      .expect(429);
  });

  test('should allow job creation after completing jobs', async () => {
    const app = express();
    app.use(express.json());
    app.use(mockAuthMiddleware('user-123'));
    app.use('/job', jobRouter);

    // Create 5 jobs
    const jobs = await jobModel.create([
      { ownerId: 'user-123', status: 'pending', name: 'job1' },
      { ownerId: 'user-123', status: 'running', name: 'job2' },
      { ownerId: 'user-123', status: 'pending', name: 'job3' },
      { ownerId: 'user-123', status: 'running', name: 'job4' },
      { ownerId: 'user-123', status: 'pending', name: 'job5' },
    ]);

    // Verify limit reached
    await request(app)
      .post('/job/create')
      .send({ name: 'Job 6' })
      .expect(429);

    // Complete 2 jobs
    await jobModel.updateOne({ _id: jobs[0]._id }, { $set: { status: 'completed' } });
    await jobModel.updateOne({ _id: jobs[1]._id }, { $set: { status: 'completed' } });

    // Should now succeed
    await request(app)
      .post('/job/create')
      .send({ name: 'Job 6' })
      .expect(201);
  });

  test('should isolate rate limits between users', async () => {
    // User 1 creates 5 jobs
    await jobModel.create([
      { ownerId: 'user-1', status: 'pending', name: 'job1' },
      { ownerId: 'user-1', status: 'running', name: 'job2' },
      { ownerId: 'user-1', status: 'pending', name: 'job3' },
      { ownerId: 'user-1', status: 'running', name: 'job4' },
      { ownerId: 'user-1', status: 'pending', name: 'job5' },
    ]);

    // User 1 should be rate limited
    const app1 = express();
    app1.use(express.json());
    app1.use(mockAuthMiddleware('user-1'));
    app1.use('/job', jobRouter);

    await request(app1)
      .post('/job/create')
      .send({ name: 'Job 6' })
      .expect(429);

    // User 2 should be able to create jobs
    const app2 = express();
    app2.use(express.json());
    app2.use(mockAuthMiddleware('user-2'));
    app2.use('/job', jobRouter);

    await request(app2)
      .post('/job/create')
      .send({ name: 'Job 1' })
      .expect(201);
  });
});
