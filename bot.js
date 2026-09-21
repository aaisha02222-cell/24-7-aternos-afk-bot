const mineflayer = require("mineflayer");
const fs = require("fs");

if (!fs.existsSync("./settings.json")) {
  console.error(
    "settings.json not found. Copy settings.example.json to settings.json."
  );
  process.exit(1);
}

const settings = JSON.parse(
  fs.readFileSync("./settings.json", "utf8")
);

let bot = null;

let reconnectTimer = null;
let antiAfkTimer = null;
let movementTimer = null;
let jumpTimer = null;

let reconnectAttempts = 0;
let moving = false;

// --------------------------------------------------
// LOG
// --------------------------------------------------

function log(message) {
  console.log(`[CoolSMP Bot] ${message}`);
}

// --------------------------------------------------
// CLEAR TIMERS
// --------------------------------------------------

function clearTimers() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (antiAfkTimer) {
    clearInterval(antiAfkTimer);
    antiAfkTimer = null;
  }

  if (movementTimer) {
    clearTimeout(movementTimer);
    movementTimer = null;
  }

  if (jumpTimer) {
    clearInterval(jumpTimer);
    jumpTimer = null;
  }

  moving = false;
}

// --------------------------------------------------
// CREATE BOT
// --------------------------------------------------

function createBot() {
  clearTimers();

  log("Connecting to Cool SMP...");

  bot = mineflayer.createBot({
    host: settings.server.host,
    port: settings.server.port,
    username: settings.bot.username,
    version: settings.server.version
  });

  // ------------------------------------------------
  // SPAWN
  // ------------------------------------------------

  bot.once("spawn", () => {
    reconnectAttempts = 0;

    log("Bot joined Cool SMP successfully! 🟢");

    // AuthMe
    if (
      settings.bot.authMe &&
      settings.bot.authMe.enabled
    ) {
      setTimeout(loginAuthMe, 2500);
    }

    // Anti-AFK
    if (
      settings.behavior &&
      settings.behavior.antiAfk
    ) {
      startAntiAfk();
    }

    // Movement
    if (
      settings.movement &&
      settings.movement.enabled
    ) {
      startMovement();
    }
  });

  // ------------------------------------------------
  // CHAT COMMANDS
  // ------------------------------------------------

  bot.on("chat", (username, message) => {
    if (!bot) return;

    // Ignore own messages
    if (username === bot.username) return;

    if (
      !settings.behavior ||
      !settings.behavior.chatCommandsEnabled
    ) {
      return;
    }

    const command = message.trim().toLowerCase();

    if (command === "!help") {
      bot.chat(
        "Bot commands: !help, !ping, !status"
      );
    }

    else if (command === "!ping") {
      bot.chat("Pong!");
    }

    else if (command === "!status") {
      bot.chat("Cool SMP bot is online.");
    }
    else if (command === "!welcome") {
  bot.chat("WELCOME TO COOL SMP");
}

else if (command === "!rules") {
  bot.chat("PLEASE FOLLOW THE SERVER RULES");
}

else if (command === "!fun") {
  bot.chat("HAVE FUN ! ENJOY ! :)");
}
  });

  // ------------------------------------------------
  // KICKED
  // ------------------------------------------------

  bot.on("kicked", (reason) => {
    log(`Kicked from server: ${reason}`);
  });

  // ------------------------------------------------
  // ERROR
  // ------------------------------------------------

  bot.on("error", (error) => {
    log(`Error: ${error.message}`);
  });

  // ------------------------------------------------
  // DISCONNECTED
  // ------------------------------------------------

  bot.on("end", (reason) => {
    log(
      `Disconnected: ${reason || "unknown reason"}`
    );

    clearTimers();

    scheduleReconnect();
  });
}

// --------------------------------------------------
// AUTHME LOGIN
// --------------------------------------------------

function loginAuthMe() {
  if (!bot) return;

  const auth = settings.bot.authMe;

  if (!auth || !auth.enabled) {
    return;
  }

  if (
    !auth.password ||
    auth.password === "CHANGE_THIS_PASSWORD"
  ) {
    log(
      "⚠️ Set the AuthMe password in settings.json."
    );
    return;
  }

  log("Logging in with AuthMe...");

  bot.chat(
    `${auth.loginCommand} ${auth.password}`
  );
}

// --------------------------------------------------
// ANTI-AFK
// --------------------------------------------------

function startAntiAfk() {
  if (!settings.behavior) return;

  const interval =
    settings.behavior.antiAfkIntervalMs || 30000;

  antiAfkTimer = setInterval(() => {
    if (!bot || !bot.entity) return;

    // Don't interfere with movement jumping
    if (moving) return;

    bot.setControlState("jump", true);

    setTimeout(() => {
      if (bot) {
        bot.setControlState("jump", false);
      }
    }, 350);

  }, interval);
}

// --------------------------------------------------
// MOVEMENT
// --------------------------------------------------

function startMovement() {
  if (!settings.movement) return;

  const cfg = settings.movement;

  const walkDuration =
    Math.max(1000, cfg.walkDurationMs || 5000);

  const pauseDuration =
    Math.max(500, cfg.pauseDurationMs || 2500);

  const jumpEvery =
    Math.max(2000, cfg.jumpEveryMs || 12000);

  // -----------------------------------------------
  // WALK CYCLE
  // -----------------------------------------------

  function walkCycle() {
    if (!bot || !bot.entity) {
      return;
    }

    moving = true;

    // Random direction
    const randomYaw =
      Math.random() * Math.PI * 2;

    bot.look(
      randomYaw,
      0,
      true
    ).catch(() => {});

    // Walk forward
    bot.setControlState(
      "forward",
      true
    );

    log("Movement: walking 🚶");

    movementTimer = setTimeout(() => {
      if (!bot) return;

      // Stop walking
      bot.setControlState(
        "forward",
        false
      );

      moving = false;

      log("Movement: paused ⏸️");

      // Random look
      if (
        cfg.randomLook &&
        bot.entity
      ) {
        const lookYaw =
          Math.random() * Math.PI * 2;

        const lookPitch =
          (Math.random() - 0.5) * 0.3;

        bot.look(
          lookYaw,
          lookPitch,
          true
        ).catch(() => {});
      }

      // Pause before walking again
      movementTimer = setTimeout(
        walkCycle,
        pauseDuration
      );

    }, walkDuration);
  }

  // -----------------------------------------------
  // JUMP WHILE MOVING
  // -----------------------------------------------

  jumpTimer = setInterval(() => {
    if (!bot || !bot.entity) return;

    // Only jump during movement
    if (!moving) return;

    bot.setControlState(
      "jump",
      true
    );

    setTimeout(() => {
      if (bot) {
        bot.setControlState(
          "jump",
          false
        );
      }
    }, 300);

  }, jumpEvery);

  // Start movement
  walkCycle();
}

// --------------------------------------------------
// RECONNECT
// --------------------------------------------------

function scheduleReconnect() {
  if (
    !settings.bot.reconnect ||
    !settings.bot.reconnect.enabled
  ) {
    log("Automatic reconnect is disabled.");
    return;
  }

  const maxAttempts =
    settings.bot.reconnect.maxAttempts || 0;

  // 0 = unlimited attempts
  if (
    maxAttempts > 0 &&
    reconnectAttempts >= maxAttempts
  ) {
    log(
      "Maximum reconnect attempts reached."
    );
    return;
  }

  reconnectAttempts++;

  const delay =
    settings.bot.reconnect.delayMs || 10000;

  log(
    `Reconnecting in ${delay / 1000} seconds...`
  );

  reconnectTimer = setTimeout(() => {
    createBot();
  }, delay);
}

// --------------------------------------------------
// CLEAN SHUTDOWN
// --------------------------------------------------

process.on("SIGINT", () => {
  log("Shutting down bot...");

  clearTimers();

  if (bot) {
    bot.quit("Bot shutting down");
  }

  process.exit(0);
});

// --------------------------------------------------
// START BOT
// --------------------------------------------------

createBot();
