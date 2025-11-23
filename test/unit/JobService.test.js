const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const JobService = require('../../api/service/JobService');
const getModel = require('../../db/model');

let mongoServer;
let jobModel;

const TEST_USER = 'user-123';
const authInfo = { userId: TEST_USER, email: 'test@example.com' };

describe('JobService Rate Limiting', () => {
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

  describe('Job Creation with Rate Limiting', () => {
    test('should create job when user has 0 active jobs', async () => {
      const result = await JobService.createJobs(authInfo, { name: 'Job 1' });

      expect(result.success).toBe(true);
      expect(result.job.ownerId).toBe(TEST_USER);
      expect(result.job.status).toBe('pending');
    });

    test('should create job when user has 4 active jobs', async () => {
      // Create 4 jobs first
      await jobModel.create([
        { ownerId: TEST_USER, status: 'pending', name: 'job1' },
        { ownerId: TEST_USER, status: 'running', name: 'job2' },
        { ownerId: TEST_USER, status: 'pending', name: 'job3' },
        { ownerId: TEST_USER, status: 'running', name: 'job4' },
      ]);

      const result = await JobService.createJobs(authInfo, { name: 'Job 5' });
      expect(result.success).toBe(true);
    });

    test('should reject job creation when user has 5 active jobs', async () => {
      // Create 5 jobs first
      await jobModel.create([
        { ownerId: TEST_USER, status: 'pending', name: 'job1' },
        { ownerId: TEST_USER, status: 'running', name: 'job2' },
        { ownerId: TEST_USER, status: 'pending', name: 'job3' },
        { ownerId: TEST_USER, status: 'running', name: 'job4' },
        { ownerId: TEST_USER, status: 'pending', name: 'job5' },
      ]);

      await expect(JobService.createJobs(authInfo, { name: 'Job 6' }))
        .rejects
        .toThrow('Rate limit exceeded');
    });

    test('should return 429 status code on rate limit error', async () => {
      // Create 5 jobs
      await jobModel.create([
        { ownerId: TEST_USER, status: 'pending', name: 'job1' },
        { ownerId: TEST_USER, status: 'running', name: 'job2' },
        { ownerId: TEST_USER, status: 'pending', name: 'job3' },
        { ownerId: TEST_USER, status: 'running', name: 'job4' },
        { ownerId: TEST_USER, status: 'pending', name: 'job5' },
      ]);

      try {
        await JobService.createJobs(authInfo, { name: 'Job 6' });
        fail('Should have thrown error');
      } catch (error) {
        expect(error.statusCode).toBe(429);
      }
    });

    test('should not count completed jobs in rate limit', async () => {
      // Create 3 pending and 2 completed jobs
      await jobModel.create([
        { ownerId: TEST_USER, status: 'pending', name: 'job1' },
        { ownerId: TEST_USER, status: 'running', name: 'job2' },
        { ownerId: TEST_USER, status: 'pending', name: 'job3' },
        { ownerId: TEST_USER, status: 'completed', name: 'job4' },
        { ownerId: TEST_USER, status: 'completed', name: 'job5' },
      ]);

      // Should succeed as only 3 are active
      const result = await JobService.createJobs(authInfo, { name: 'Job 6' });
      expect(result.success).toBe(true);
    });

    test('should not count dlq jobs in rate limit', async () => {
      // Create 4 active and 3 dlq jobs
      await jobModel.create([
        { ownerId: TEST_USER, status: 'pending', name: 'job1' },
        { ownerId: TEST_USER, status: 'running', name: 'job2' },
        { ownerId: TEST_USER, status: 'pending', name: 'job3' },
        { ownerId: TEST_USER, status: 'running', name: 'job4' },
        { ownerId: TEST_USER, status: 'dlq', name: 'job5' },
        { ownerId: TEST_USER, status: 'dlq', name: 'job6' },
      ]);

      // Should succeed as only 4 are active
      const result = await JobService.createJobs(authInfo, { name: 'Job 7' });
      expect(result.success).toBe(true);
    });

    test('should allow job creation after completing jobs', async () => {
      // Create 5 jobs
      const jobs = await jobModel.create([
        { ownerId: TEST_USER, status: 'pending', name: 'job1' },
        { ownerId: TEST_USER, status: 'running', name: 'job2' },
        { ownerId: TEST_USER, status: 'pending', name: 'job3' },
        { ownerId: TEST_USER, status: 'running', name: 'job4' },
        { ownerId: TEST_USER, status: 'pending', name: 'job5' },
      ]);

      // Complete 2 jobs
      await jobModel.updateOne({ _id: jobs[0]._id }, { $set: { status: 'completed' } });
      await jobModel.updateOne({ _id: jobs[1]._id }, { $set: { status: 'completed' } });

      // Should now succeed
      const result = await JobService.createJobs(authInfo, { name: 'Job 6' });
      expect(result.success).toBe(true);
    });

    test('should isolate rate limits between different users', async () => {
      const user1 = { userId: 'user-1', email: 'user1@test.com' };
      const user2 = { userId: 'user-2', email: 'user2@test.com' };

      // User 1 creates 5 jobs
      await jobModel.create([
        { ownerId: 'user-1', status: 'pending', name: 'job1' },
        { ownerId: 'user-1', status: 'running', name: 'job2' },
        { ownerId: 'user-1', status: 'pending', name: 'job3' },
        { ownerId: 'user-1', status: 'running', name: 'job4' },
        { ownerId: 'user-1', status: 'pending', name: 'job5' },
      ]);

      // User 1 should be rate limited
      await expect(JobService.createJobs(user1, { name: 'Job 6' }))
        .rejects
        .toThrow('Rate limit exceeded');

      // User 2 should be able to create jobs
      const result = await JobService.createJobs(user2, { name: 'Job 1' });
      expect(result.success).toBe(true);
    });

    test('should set correct job fields', async () => {
      const result = await JobService.createJobs(authInfo, { name: 'Test Job' });

      expect(result.job.name).toBe('Test Job');
      expect(result.job.ownerId).toBe(TEST_USER);
      expect(result.job.status).toBe('pending');
      expect(result.job.con).toBeDefined();
      expect(result.job.mon).toBeDefined();
    });

    test('should create 5 jobs sequentially', async () => {
      for (let i = 1; i <= 5; i++) {
        const result = await JobService.createJobs(authInfo, { name: `Job ${i}` });
        expect(result.success).toBe(true);
      }

      // 6th should fail
      await expect(JobService.createJobs(authInfo, { name: 'Job 6' }))
        .rejects
        .toThrow('Rate limit exceeded');
    });
  });
});
