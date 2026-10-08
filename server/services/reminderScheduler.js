const cron = require("node-cron");

const {
  readData,
  writeData,
} = require("../utils/db");

const {
  sendTaskReminderEmail,
} = require("./mailerService");

/*
|--------------------------------------------------------------------------
| LOCAL DATE
|--------------------------------------------------------------------------
*/

const getLocalDateString = (
  date = new Date()
) => {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/*
|--------------------------------------------------------------------------
| LOCAL TIME
|--------------------------------------------------------------------------
*/

const getLocalTimeString = (
  date = new Date()
) => {
  const hours =
    String(
      date.getHours()
    ).padStart(2, "0");

  const minutes =
    String(
      date.getMinutes()
    ).padStart(2, "0");

  return `${hours}:${minutes}`;
};

/*
|--------------------------------------------------------------------------
| START EMAIL REMINDER SCHEDULER
|--------------------------------------------------------------------------
*/

const startReminderScheduler = () => {
  /*
   * Every minute
   */

  cron.schedule("* * * * *", async () => {
    try {
      const now =
        new Date();

      const currentDate =
        getLocalDateString(
          now
        );

      const currentTime =
        getLocalTimeString(
          now
        );

      const tasks =
        readData(
          "tasks.json"
        );

      const users =
        readData(
          "users.json"
        );

      let changed =
        false;

      for (
        let i = 0;
        i < tasks.length;
        i++
      ) {
        const task =
          tasks[i];

        /*
        |--------------------------------------------------------------------------
        | ONLY PENDING
        |--------------------------------------------------------------------------
        */

        if (
          task.status ===
          "completed"
        ) {
          continue;
        }

        /*
        |--------------------------------------------------------------------------
        | DATE / TIME MATCH
        |--------------------------------------------------------------------------
        */

        if (
          task.date !==
            currentDate ||
          task.time !==
            currentTime
        ) {
          continue;
        }

        /*
        |--------------------------------------------------------------------------
        | UNIQUE REMINDER KEY
        |--------------------------------------------------------------------------
        */

        const reminderKey =
          `${task.date}_${task.time}`;

        /*
         * Already sent for
         * this date + time
         */

        if (
          task.lastEmailReminderKey ===
          reminderKey
        ) {
          continue;
        }

        /*
        |--------------------------------------------------------------------------
        | FIND USER
        |--------------------------------------------------------------------------
        */

        const user =
          users.find(
            (item) =>
              item.id ===
              task.userId
          );

        if (
          !user ||
          !user.email
        ) {
          console.log(
            `No email found for task ${task.id}`
          );

          continue;
        }

        try {
          await sendTaskReminderEmail({
            email:
              user.email,

            name:
              user.name,

            task,
          });

          /*
          |--------------------------------------------------------------------------
          | MARK SENT
          |--------------------------------------------------------------------------
          */

          tasks[
            i
          ].lastEmailReminderKey =
            reminderKey;

          tasks[
            i
          ].lastEmailReminderAt =
            new Date().toISOString();

          changed =
            true;

          console.log(
            `📧 Reminder sent to ${user.email} for "${task.title}"`
          );
        } catch (
          mailError
        ) {
          console.error(
            `Email failed for ${user.email}:`,
            mailError.message
          );
        }
      }

      if (changed) {
        writeData(
          "tasks.json",
          tasks
        );
      }
    } catch (error) {
      console.error(
        "Reminder Scheduler Error:",
        error
      );
    }
  });

  console.log(
    "📧 TaskWake email reminder scheduler started"
  );
};

module.exports = {
  startReminderScheduler,
};