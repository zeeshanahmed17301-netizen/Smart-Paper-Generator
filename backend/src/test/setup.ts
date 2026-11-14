process.env.NODE_ENV = "test";
process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/smart-paper-generator-test";
process.env.JWT_SECRET ??= "test-secret-that-is-at-least-32-characters-long";
