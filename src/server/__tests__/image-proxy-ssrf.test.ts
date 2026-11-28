import { describe, it, expect } from "vitest";
import { imageProxyBlockReason } from "../routes/media";

// /api/image-proxy fetches arbitrary public URLs on behalf of the browser.
// Every hop must be checked, because Node's fetch follows redirects by
// default: a public host answering 302 to 169.254.169.254 would otherwise be
// fetched after the guard had only seen the first (public) URL.
describe("image-proxy SSRF guard", () => {
  const allowed = [
    "https://tabefotbal.ir/uploads/media_assets/player_photo/x.webp",
    "https://www.varzesh3.com/img/a.jpg",
    "http://cdn.example.com/logo.png",
    "https://thumb.wikimedia.org/wikipedia/fa/thumb/2/28/x.svg/250px-x.png",
  ];
  const blocked = [
    "http://localhost:3000/api/data",
    "http://127.0.0.1/",
    "http://0.0.0.0:8080/",
    "http://169.254.169.254/latest/meta-data/",
    "http://169.254.169.253/",
    "http://metadata.google.internal/computeMetadata/v1/",
    "http://10.0.0.5/secret.png",
    "http://172.16.4.4/",
    "http://172.31.255.255/",
    "http://192.168.1.10/admin.png",
    "http://127.1/",
    "http://0x7f000001/",
    "http://2130706433/",
    "http://[::1]/",
    "http://[fd00::1]/",
    "http://[fe80::1]/",
    "file:///etc/passwd",
    "gopher://example.com/",
  ];

  it.each(allowed)("allows public target %s", (url) => {
    expect(imageProxyBlockReason(new URL(url))).toBeNull();
  });

  it.each(blocked)("blocks internal target %s", (url) => {
    expect(imageProxyBlockReason(new URL(url))).not.toBeNull();
  });

  it("distinguishes a bad scheme (400) from a private address (403)", () => {
    expect(imageProxyBlockReason(new URL("file:///etc/passwd"))).toMatch(/HTTP\/HTTPS/);
    expect(imageProxyBlockReason(new URL("http://10.1.2.3/"))).toMatch(/internal\/private/);
  });
});
