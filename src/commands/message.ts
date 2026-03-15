import { Command } from 'commander';
import { DiscordAPI } from '../utils/api.js';
import { requireToken, requireServer } from '../utils/config.js';
import { printResult, resolveFormat } from '../utils/output.js';
import { resolveChannel } from '../utils/resolve.js';

export function registerMessage(program: Command): void {
  const message = program
    .command('message')
    .alias('msg')
    .description('Send and manage messages');

  message
    .command('send')
    .description('Send a message to a channel')
    .argument('<channel>', 'Channel name or ID')
    .argument('<text>', 'Message content')
    .action(async (channelName: string, text: string) => {
      const fmt = resolveFormat(program.opts().format);
      const api = new DiscordAPI(requireToken());
      const guildId = requireServer(program.opts().server);
      const ch = await resolveChannel(api, guildId, channelName);

      const msg = await api.sendMessage(ch.id, text);
      if (fmt !== 'table') {
        printResult(msg, fmt);
      } else {
        console.log(`Sent message to #${ch.name}`);
      }
    });
}
