const express =
  require("express");

const {
  sendTestEmail,
} = require("../services/mailerService");

const router =
  express.Router();

/*
|--------------------------------------------------------------------------
| TEST EMAIL
|--------------------------------------------------------------------------
|
| Example:
| http://localhost:5000/api/mail/test?email=test@gmail.com
|
|--------------------------------------------------------------------------
*/

router.get(
  "/test",
  async (req, res) => {
    try {
      const {
        email,
      } = req.query;

      if (!email) {
        return res
          .status(400)
          .json({
            success:
              false,

            message:
              "Please provide email in query string",
          });
      }

      await sendTestEmail(
        email
      );

      return res.json({
        success:
          true,

        message:
          `Test email sent to ${email}`,
      });
    } catch (error) {
      console.error(
        "Test Mail Error:",
        error
      );

      return res
        .status(500)
        .json({
          success:
            false,

          message:
            error.message,
        });
    }
  }
);

module.exports =
  router;