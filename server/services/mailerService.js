const nodemailer = require("nodemailer");

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST || "smtp.gmail.com",

    port: Number(
      process.env.MAIL_PORT || 587
    ),

    secure: false,

    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });
};

/*
|--------------------------------------------------------------------------
| SEND TASK REMINDER
|--------------------------------------------------------------------------
*/

const sendTaskReminderEmail = async ({
  email,
  name,
  task,
}) => {
  const transporter = createTransporter();

  const priority =
    task.priority
      ? task.priority
          .charAt(0)
          .toUpperCase() +
        task.priority.slice(1)
      : "Medium";

  const subject =
    `🔔 TaskWake Reminder — ${task.title}`;

  const html = `
    <!DOCTYPE html>

    <html>
      <head>
        <meta charset="UTF-8" />

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />
      </head>

      <body
        style="
          margin:0;
          padding:0;
          background:#f5f6fb;
          font-family:Arial,sans-serif;
          color:#263247;
        "
      >

        <div
          style="
            max-width:620px;
            margin:0 auto;
            padding:35px 20px;
          "
        >

          <div
            style="
              background:#ffffff;
              border-radius:22px;
              overflow:hidden;
              box-shadow:0 12px 40px rgba(30,40,70,.08);
            "
          >

            <div
              style="
                padding:28px 30px;
                background:linear-gradient(
                  135deg,
                  #6c5ce7,
                  #8b78f6
                );
                color:white;
              "
            >

              <div
                style="
                  font-size:22px;
                  font-weight:800;
                "
              >
                🔔 TaskWake AI
              </div>

              <div
                style="
                  margin-top:7px;
                  font-size:13px;
                  opacity:.85;
                "
              >
                Smart productivity reminder
              </div>

            </div>

            <div
              style="
                padding:30px;
              "
            >

              <p
                style="
                  margin-top:0;
                  font-size:15px;
                "
              >
                Hi ${name || "there"},
              </p>

              <h2
                style="
                  margin:18px 0 8px;
                  font-size:24px;
                  color:#202a3d;
                "
              >
                Your task is due now
              </h2>

              <p
                style="
                  color:#747e91;
                  line-height:1.7;
                  font-size:14px;
                "
              >
                TaskWake noticed that one of your scheduled
                tasks has reached its reminder time.
              </p>

              <div
                style="
                  margin:24px 0;
                  padding:20px;
                  border:1px solid #e8e4ff;
                  border-radius:16px;
                  background:#f9f8ff;
                "
              >

                <div
                  style="
                    font-size:18px;
                    font-weight:700;
                    color:#2c3548;
                  "
                >
                  ${task.title}
                </div>

                ${
                  task.description
                    ? `
                      <div
                        style="
                          margin-top:8px;
                          color:#7b8496;
                          font-size:13px;
                          line-height:1.6;
                        "
                      >
                        ${task.description}
                      </div>
                    `
                    : ""
                }

                <div
                  style="
                    margin-top:16px;
                    font-size:13px;
                    color:#626d80;
                  "
                >
                  📅 ${task.date}
                </div>

                <div
                  style="
                    margin-top:6px;
                    font-size:13px;
                    color:#626d80;
                  "
                >
                  ⏰ ${task.time}
                </div>

                <div
                  style="
                    margin-top:6px;
                    font-size:13px;
                    color:#626d80;
                  "
                >
                  ⚡ Priority: ${priority}
                </div>

              </div>

              <p
                style="
                  color:#707a8e;
                  font-size:13px;
                  line-height:1.7;
                "
              >
                If you don't complete this task, TaskWake
                can automatically carry it forward so it
                doesn't disappear from your schedule.
              </p>

            </div>

            <div
              style="
                padding:18px 30px;
                background:#fafbfc;
                color:#9aa2b1;
                font-size:11px;
                text-align:center;
              "
            >
              TaskWake AI — Never let unfinished work disappear.
            </div>

          </div>

        </div>

      </body>
    </html>
  `;

  return transporter.sendMail({
    from:
      process.env.MAIL_FROM ||
      process.env.MAIL_USER,

    to: email,

    subject,

    html,
  });
};

/*
|--------------------------------------------------------------------------
| TEST EMAIL
|--------------------------------------------------------------------------
*/

const sendTestEmail = async (email) => {
  const transporter = createTransporter();

  return transporter.sendMail({
    from:
      process.env.MAIL_FROM ||
      process.env.MAIL_USER,

    to: email,

    subject:
      "✅ TaskWake AI Email Test",

    html: `
      <div
        style="
          font-family:Arial,sans-serif;
          padding:30px;
        "
      >
        <h2>
          TaskWake AI is connected 🎉
        </h2>

        <p>
          Your email reminder system is working successfully.
        </p>
      </div>
    `,
  });
};

module.exports = {
  sendTaskReminderEmail,
  sendTestEmail,
};