const UserService = require("./UserService");
const { createJwtToken } = require('../../util/jwtUtils');

class LoginService {
  constructor() {}

  async login(payload) {
    const { email, password } = payload;
    const user = await UserService.getUserByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }
    if (user.password !== password) {
      throw new Error('Invalid password');
    }
    const token = createJwtToken({userId: user._id, email: user.email});
    return {success: true, jwt: token};
  }
};

module.exports = new LoginService();