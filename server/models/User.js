const { randomUUID } = require("crypto");

const createUser = ({ name, email, password }) => {
  return {
    id: randomUUID(),
    name,
    email,
    password,
    createdAt: new Date().toISOString(),
  };
};

module.exports = {
  createUser,
};