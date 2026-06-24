import net from "node:net";
import tls from "node:tls";
import type { BackendEnv } from "../config/env.js";

export type MailSendInput = {
  to: string;
  fromAddress: string;
  fromName: string;
  subject: string;
  text: string;
};

export type MailSender = {
  send(input: MailSendInput): Promise<void>;
};

export function createSmtpMailSender(env: BackendEnv): MailSender {
  return {
    async send(input) {
      if (!env.smtpHost || !env.smtpUser || !env.smtpPassword) {
        throw new Error("smtp_not_configured");
      }
      await sendSmtpMail(env, input);
    },
  };
}

async function sendSmtpMail(env: BackendEnv, input: MailSendInput) {
  const socket = env.smtpSecure
    ? tls.connect({ host: env.smtpHost, port: env.smtpPort, servername: env.smtpHost })
    : net.connect({ host: env.smtpHost, port: env.smtpPort });
  socket.setEncoding("utf8");

  const connection = new SmtpConnection(socket);
  try {
    await connection.expect(220);
    await connection.command(`EHLO ${smtpDomain(env.mailFromAddress)}`, 250);
    await connection.command("AUTH LOGIN", 334);
    await connection.command(Buffer.from(env.smtpUser ?? "", "utf8").toString("base64"), 334);
    await connection.command(Buffer.from(env.smtpPassword ?? "", "utf8").toString("base64"), 235);
    await connection.command(`MAIL FROM:<${input.fromAddress}>`, 250);
    await connection.command(`RCPT TO:<${input.to}>`, [250, 251]);
    await connection.command("DATA", 354);
    await connection.writeData(buildMessage(input));
    await connection.expect(250);
    await connection.command("QUIT", 221);
  } finally {
    socket.destroy();
  }
}

function buildMessage(input: MailSendInput) {
  const headers = [
    `From: ${formatMailbox(input.fromName, input.fromAddress)}`,
    `To: <${input.to}>`,
    `Subject: ${mimeHeader(input.subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
  ];
  const body = input.text.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
  return `${headers.join("\r\n")}\r\n\r\n${body}\r\n.\r\n`;
}

function formatMailbox(name: string, address: string) {
  return `${mimeHeader(name)} <${address}>`;
}

function mimeHeader(value: string) {
  if (/^[\x20-\x7e]+$/.test(value)) return value.replace(/"/g, '\\"');
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function smtpDomain(address: string) {
  return address.split("@")[1] ?? "localhost";
}

class SmtpConnection {
  private buffer = "";
  private waiters: Array<() => void> = [];
  private error: Error | undefined;

  constructor(private readonly socket: net.Socket | tls.TLSSocket) {
    socket.on("data", (chunk) => {
      this.buffer += String(chunk);
      this.flush();
    });
    socket.on("error", (error) => {
      this.error = error;
      this.flush();
    });
    socket.on("close", () => {
      this.error ??= new Error("smtp_connection_closed");
      this.flush();
    });
  }

  async command(command: string, expected: number | readonly number[]) {
    this.socket.write(`${command}\r\n`);
    return this.expect(expected);
  }

  async writeData(data: string) {
    this.socket.write(data);
  }

  async expect(expected: number | readonly number[]) {
    const accepted = Array.isArray(expected) ? expected : [expected];
    const response = await this.readResponse();
    if (!accepted.includes(response.code)) {
      throw new Error(`smtp_unexpected_response_${response.code}`);
    }
    return response;
  }

  private async readResponse(): Promise<{ code: number; text: string }> {
    const lines: string[] = [];
    while (true) {
      const line = await this.readLine();
      lines.push(line);
      if (/^\d{3} /.test(line)) {
        return {
          code: Number.parseInt(line.slice(0, 3), 10),
          text: lines.join("\n"),
        };
      }
    }
  }

  private async readLine() {
    while (true) {
      if (this.error) throw this.error;
      const newline = this.buffer.indexOf("\n");
      if (newline >= 0) {
        const line = this.buffer.slice(0, newline).replace(/\r$/, "");
        this.buffer = this.buffer.slice(newline + 1);
        return line;
      }
      await new Promise<void>((resolve) => {
        this.waiters.push(resolve);
      });
    }
  }

  private flush() {
    const waiters = this.waiters.splice(0);
    for (const waiter of waiters) waiter();
  }
}
