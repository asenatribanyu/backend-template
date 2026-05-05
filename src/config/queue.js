export default {
  defaultJobOptions: {
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
  },

  concurrency: 5,
};
