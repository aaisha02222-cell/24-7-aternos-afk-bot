const mineflayer=require('mineflayer');const fs=require('fs');
if(!fs.existsSync('./settings.json')){console.error('settings.json not found. Copy settings.example.json to settings.json.');process.exit(1)}
const s=JSON.parse(fs.readFileSync('./settings.json','utf8'));let bot=null,reconnectTimer=null,afkTimer=null,attempts=0;
const log=m=>console.log(`[CoolSMP Bot] ${m}`);
function clearTimers(){if(reconnectTimer)clearTimeout(reconnectTimer);if(afkTimer)clearInterval(afkTimer);reconnectTimer=afkTimer=null}
function createBot(){clearTimers();log(`Connecting to ${s.server.host}:${s.server.port} as ${s.bot.username}...`);bot=mineflayer.createBot({host:s.server.host,port:s.server.port,username:s.bot.username,version:s.server.version});
bot.once('spawn',()=>{attempts=0;log('Bot joined the server.');if(s.bot.authMe.enabled)setTimeout(authenticate,2500);if(s.behavior.antiAfk)startAfk()});
bot.on('chat',(u,m)=>{if(u!==bot.username)handleChat(m)});bot.on('kicked',r=>log(`Bot was kicked: ${r}`));bot.on('error',e=>log(`Error: ${e.message}`));bot.on('end',r=>{log(`Disconnected: ${r||'unknown reason'}`);clearTimers();reconnect()})}
function authenticate(){const a=s.bot.authMe;if(!a.enabled)return;if(!a.password||a.password==='CHANGE_THIS_PASSWORD'){log('Set your AuthMe password in settings.json.');return}bot.chat(`${a.loginCommand} ${a.password}`)}
function handleChat(m){if(!s.behavior.chatCommandsEnabled)return;const c=m.trim().toLowerCase();if(c==='!help')bot.chat('Bot commands: !help, !ping, !status');else if(c==='!ping')bot.chat('Pong!');else if(c==='!status')bot.chat('Cool SMP bot is online.')}
function startAfk(){afkTimer=setInterval(()=>{if(!bot?.entity)return;bot.setControlState('jump',true);setTimeout(()=>bot&&bot.setControlState('jump',false),350)},s.behavior.antiAfkIntervalMs)}
function reconnect(){if(!s.bot.reconnect.enabled)return;const max=s.bot.reconnect.maxAttempts;if(max>0&&attempts>=max){log('Maximum reconnect attempts reached.');return}attempts++;log(`Reconnecting in ${Math.round(s.bot.reconnect.delayMs/1000)} seconds...`);reconnectTimer=setTimeout(createBot,s.bot.reconnect.delayMs)}
process.on('SIGINT',()=>{clearTimers();if(bot)bot.quit('Bot shutting down');process.exit(0)});createBot();
