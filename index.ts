import { config } from "dotenv";
import { streamText } from "ai";

config({ path: ".env.local" });

async function main() {
  const result = streamText({
    model: "openai/gpt-5.4",
    prompt: "Write one short sentence confirming that Vercel AI Gateway is working.",
  });

  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
  }

  console.log();
  console.log("Token usage:", await result.usage);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
