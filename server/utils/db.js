const fs = require("fs");
const path = require("path");

const readData = (fileName) => {
  try {
    const filePath = path.join(__dirname, "../data", fileName);

    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify([], null, 2));
    }

    const data = fs.readFileSync(filePath, "utf8");

    if (!data.trim()) {
      return [];
    }

    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${fileName}:`, error.message);
    return [];
  }
};

const writeData = (fileName, data) => {
  try {
    const filePath = path.join(__dirname, "../data", fileName);

    fs.writeFileSync(
      filePath,
      JSON.stringify(data, null, 2),
      "utf8"
    );

    return true;
  } catch (error) {
    console.error(`Error writing ${fileName}:`, error.message);
    return false;
  }
};

module.exports = {
  readData,
  writeData,
};