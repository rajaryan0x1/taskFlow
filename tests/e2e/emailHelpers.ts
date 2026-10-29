import { expect, type APIRequestContext } from "@playwright/test";
export async function emailLink(request: APIRequestContext, email: string, subject: string): Promise<string> {
  let messages: { subject: string; text: string }[] = [];
  await expect.poll(async () => {
    messages = await (await request.get(`http://127.0.0.1:5100/__test/mail?email=${encodeURIComponent(email)}`)).json();
    return messages.filter(message => message.subject === subject).length;
  }).toBeGreaterThan(0);
  return messages.filter(message => message.subject === subject).at(-1)!.text.match(/http[^\s]+#token=[a-f0-9]+/)![0];
}

export async function verifyFixtureEmail(request: APIRequestContext, email: string) {
  const link = await emailLink(request, email, "Verify your TaskFlow email");
  const token = new URLSearchParams(new URL(link).hash.slice(1)).get("token");
  const response = await request.post("http://127.0.0.1:5100/api/v1/auth/verify-email", {
    headers: { Origin: "http://127.0.0.1:5178", "X-TaskFlow-Client": "web" }, data: { token },
  });
  expect(response.status()).toBe(200);
}
