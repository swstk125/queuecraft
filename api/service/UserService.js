const getModel = require("../../db/model");

class UserService {
    constructor() {
        this.userModel = getModel("user");
    }

    async createUser(user) {
      try {
        const newUser = await this.userModel.create(user);
        return newUser;
      } catch (error) {
        console.error('Error creating user:', error);
        throw error;
      }
    }

    async getUser(userId) {
        return this.userModel.findById(userId);
    }

    async getUserByEmail(email){
      try {
        return this.userModel.findOne({ email });
      } catch (error) {
        console.log(error);
      }
    }

    async updateUser(userId, user) {
        return this.userModel.findByIdAndUpdate(userId, user);
    }

    async deleteUser(userId) {
        return this.userModel.findByIdAndDelete(userId);
    }
}

module.exports = new UserService();