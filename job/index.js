module.exports = initializeJobProcessor = async () => {
  try {
    console.log('Job processor initialized');
    while (true) {
      console.log('Job processor running');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.error('Error initializing job processor:', error);
  }
};
