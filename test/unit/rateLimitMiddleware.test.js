describe('Rate Limit Middleware', () => {
  let req, res, next, rateLimitMiddleware;

  beforeEach(() => {
    // Re-require the middleware to get fresh state for each test
    jest.resetModules();
    rateLimitMiddleware = require('../../api/middleware/rateLimitMiddleware');

    req = {
      method: 'POST',
      path: '/create',
      authInfo: { userId: 'test-user', email: 'test@example.com' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  test('should allow first request', () => {
    const middleware = rateLimitMiddleware();
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should allow up to 10 requests within a minute', () => {
    const middleware = rateLimitMiddleware();

    for (let i = 0; i < 10; i++) {
      middleware(req, res, next);
    }

    expect(next).toHaveBeenCalledTimes(10);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should reject 11th request within a minute', () => {
    const middleware = rateLimitMiddleware();

    // Make 10 successful requests
    for (let i = 0; i < 10; i++) {
      middleware(req, res, next);
    }

    // 11th request should be rejected
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(10);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'Rate limit exceeded',
        message: expect.stringContaining('Maximum 10 job creation attempts per minute')
      })
    );
  });

  test('should skip rate limiting for non-POST requests', () => {
    const middleware = rateLimitMiddleware();
    req.method = 'GET';

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should skip rate limiting for non-create paths', () => {
    const middleware = rateLimitMiddleware();
    req.path = '/list';

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should skip rate limiting if user not authenticated', () => {
    const middleware = rateLimitMiddleware();
    req.authInfo = null;

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should isolate rate limits between different users', () => {
    const middleware = rateLimitMiddleware();

    // User 1 makes 10 requests
    for (let i = 0; i < 10; i++) {
      middleware(req, res, next);
    }

    // User 2 should be able to make requests
    req.authInfo = { userId: 'user-2', email: 'user2@example.com' };
    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(11);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should include retryAfter in error response', () => {
    const middleware = rateLimitMiddleware();

    // Make 10 requests
    for (let i = 0; i < 10; i++) {
      middleware(req, res, next);
    }

    // 11th request
    middleware(req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        retryAfter: expect.any(Number)
      })
    );
  });
});

