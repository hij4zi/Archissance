/* POST /api/contact — the site's contact form, wired to GoDaddy Node.js
   Hosting's email gateway (see ~/.claude/skills/godaddy-nodejs-hosting/
   email.md). Handles two submission modes so the form still works with
   JavaScript disabled, matching this project's "everything degrades"
   convention (assets/js/main.js):

     - JS-enhanced (assets/js/main.js intercepts submit, POSTs JSON,
       shows an inline success/error message) -> responds JSON.
     - Plain HTML form POST (no JS) -> application/x-www-form-urlencoded,
       responds with a 303 redirect back to contact.html so a page
       refresh doesn't resubmit.

   Locally (no GoDaddy container), the email gateway at 127.0.0.1:2525
   isn't running, so sendEmail() throws "email gateway unreachable" —
   that's expected; the route still exercises validation/response logic
   correctly, it just can't complete a real send outside the platform. */
import { sendEmail } from "./email.mjs";

const MAX_BODY_BYTES = 64 * 1024; // a contact form has no business being larger

function readBody(req) {
  return new Promise((resolve, reject) => {
    let bytes = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > MAX_BODY_BYTES) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function parseFields(raw, contentType) {
  if (contentType.includes("application/json")) {
    const data = JSON.parse(raw || "{}");
    return { fields: data, isJson: true };
  }
  // application/x-www-form-urlencoded (native <form method="POST"> submit)
  const fields = Object.fromEntries(new URLSearchParams(raw));
  return { fields, isJson: false };
}

function respondJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json", "content-length": Buffer.byteLength(payload) });
  res.end(payload);
}

function respondRedirect(res, query) {
  res.writeHead(303, { location: `/contact.html?${query}` });
  res.end();
}

export async function handleContact(req, res) {
  let isJson = false;
  try {
    const raw = await readBody(req);
    const contentType = req.headers["content-type"] || "";
    const parsed = parseFields(raw, contentType);
    const fields = parsed.fields;
    isJson = parsed.isJson;

    const name = String(fields.name || "").trim();
    const email = String(fields.email || "").trim();
    const message = String(fields.message || "").trim();
    const projectType = String(fields.project_type || "").trim();

    if (!name || !email || !message) {
      const msg = "Please fill in your name, email, and message.";
      return isJson ? respondJson(res, 400, { error: msg }) : respondRedirect(res, "sent=0");
    }
    // basic shape check — not full RFC 5322 validation, just catches typos
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const msg = "That email address doesn't look right.";
      return isJson ? respondJson(res, 400, { error: msg }) : respondRedirect(res, "sent=0");
    }

    const recipient = process.env.CONTACT_FORM_RECIPIENT_EMAIL;
    if (!recipient) {
      // Fail closed — sending to nowhere would silently drop submissions.
      console.error("email.contact_form.recipient_unset");
      const msg = "This form isn't fully configured yet — please email us directly instead.";
      return isJson ? respondJson(res, 500, { error: msg }) : respondRedirect(res, "sent=0");
    }

    const bodyLines = [
      `From: ${name} (${email})`,
      projectType ? `Project type: ${projectType}` : null,
      "",
      message,
    ].filter((l) => l !== null);

    await sendEmail({
      to: recipient,
      replyTo: email,
      subject: `Contact form: ${name}`,
      text: bodyLines.join("\n"),
      // No html field — user input must not be interpolated into HTML without escaping.
    });

    return isJson ? respondJson(res, 200, { success: true }) : respondRedirect(res, "sent=1");
  } catch (err) {
    console.error("email.send.failed", err);
    const msg = "We couldn't send your message — please try again or email us directly.";
    return isJson ? respondJson(res, 500, { error: msg }) : respondRedirect(res, "sent=0");
  }
}
