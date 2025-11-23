const getModel = require("../../db/model");
const cache = require("../../util/cacheUtils");

class UserService {
    constructor() {
        this.userModel = getModel("user");
    }

    async createUser(user) {
      try {
        const newUser = await this.userModel.create(user);
        
        // Cache the new user by email
        const userObject = newUser.toObject ? newUser.toObject() : newUser;
        const cacheKey = cache.getUserByEmailKey(user.email);
        await cache.set(cacheKey, userObject, 600); // Cache for 10 minutes
        
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
        // Try cache first
        const cacheKey = cache.getUserByEmailKey(email);
        const cachedUser = await cache.get(cacheKey);
        
        if (cachedUser) {
          // Return as Mongoose-like object
          return cachedUser;
        }
        
        // Get from DB
        const user = await this.userModel.findOne({ email });
        
        if (user) {
          const userObject = user.toObject ? user.toObject() : user;
          await cache.set(cacheKey, userObject, 600); // Cache for 10 minutes
          return user;
        }
        
        return null;
      } catch (error) {
        console.log(error);
      }
    }

    async updateUser(userId, user) {
        const updatedUser = await this.userModel.findByIdAndUpdate(userId, user);
        
        // Invalidate cache if email is present
        if (updatedUser && updatedUser.email) {
          const cacheKey = cache.getUserByEmailKey(updatedUser.email);
          await cache.del(cacheKey);
        }
        
        return updatedUser;
    }

    async deleteUser(userId) {
        const deletedUser = await this.userModel.findByIdAndDelete(userId);
        
        // Invalidate cache if email is present
        if (deletedUser && deletedUser.email) {
          const cacheKey = cache.getUserByEmailKey(deletedUser.email);
          await cache.del(cacheKey);
        }
        
        return deletedUser;
    }
}

module.exports = new UserService();