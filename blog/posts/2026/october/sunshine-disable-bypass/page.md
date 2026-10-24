---
layout: layouts/post.liquid
title: Disabled but not really (Sunshine CVE-2026-111044)
subtitle: pwned by a carriage return =)
date: 2026-10-23T23:05:25-04:00
dateDisplay: October 23th, 2026 at 11:05 PM EDT
permalink: /blog/posts/2026/october/sunshine-disable-bypass.html
---

<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/languages/cpp.min.js"></script>
<script>hljs.highlightAll();</script>

In just about any piece of software, disabling something's access is supposed to mean it can't access that thing anymore. That's the entire point of a control like that, and it's usually why you'd pick "disable" compared to deleting something outright, since it's the gentler and more reversible option of the two. Sunshine, an open-source game-streaming host that most people run with Moonlight, has exactly this kind of feature: you can disable a clients access without fully deleting it. For a good stretch of releases, though, disabling a client didn't actually guarantee access was revoked at all. A client that happened to be paired in a particular way could just keep connecting afterwards, and the owner would be none the wiser that its decision to cut that client off had silently failed.

I ran into this while looking into how Sunshine decides whether a paired client is still allowed to connect, and ended up discovering a pretty neat (and silly) way to **completely bypass the disable control for clients in Sunshine.** I ended up reporting the vulnerability via the GitHub repository's Security Advisory portal, where it was eventually consolidated with another researcher's related findings into [**CVE-2026-111044**](https://nvd.nist.gov/vuln/detail/cve-2026-111044), a high-severity vulnerability with a CVSS score of **7.6/10.**

## First, what even is Sunshine?

<sub>**psst, if you just wanna see the exploit, move on to the "So what's going on here?" section**</sub>

If you've never heard of it, [Sunshine](https://github.com/LizardByte/Sunshine) is a popular game streaming software with 7.8M+ downloads and 43K stars on GitHub. You install it on the computer you actually want to play from, usually a gaming PC with the real horsepower, and it captures that computer's screen, encodes it, and streams it out over your network. On the other end is a client, almost always Moonlight, running on a laptop, a phone, a tablet, a TV, whatever you happen to have lying around. Moonlight shows you the stream and sends your keyboard, mouse, and controller input back to the host. Put the two together and you've basically got your own private [GeForce Now](https://www.nvidia.com/en-us/geforce-now/), where the game runs on the beefy computer at home and you play it from whatever teeny little device is in your hands.

That's the core pitch, and it's a genuinely great piece of software. I used to use it all the time when I had enough time to play games on my TV all day using my Steam Deck to stream to my Amazon Firestick (oh how I miss summer). But the caveat here that's easy to gloss over, and makes my exploit much more concerning, is that Sunshine is essentially streaming your computer, not just your game library. By default it even exposes a "Desktop" entry that streams your actual desktop, and even when you launch straight into a specific game instead, the client is still feeding input to the host the entire time. So pairing a client doesn't just mean "let this device watch me play." It means something a lot closer to "let this device see my screen and control my computer."

Now think about what that actually means as an attack surface. The worst a leaky media server can really do is tell someone what you've been watching. The worst a paired Sunshine client can do is **sit down at your keyboard as you**. It can see whatever is on the display and it can move the mouse and type, and if that desktop happens to be unlocked with a browser already signed into your email or your bank, then that is the whole computer right there. The trust you hand out when you pair a client is not a small thing, and that's exactly why it matters who is still holding onto it.

Because that trust is so broad, Sunshine does have considerable controls in place for security. A client has to pair to a computer first, sort of like Bluetooth. This pairing is a one-time handshake where the client shows a PIN, you type that PIN into Sunshine's web interface, and assuming it all checks out, Sunshine saves a copy of that client's certificate. From that point on, **the certificate is basically the client's badge.** It's how the host recognizes the device on every connection afterwards, without having to make you approve it all over again each time.

And since pairing is supposed to be reversible, Sunshine gives you two different ways to take that badge back: unpairing a client, which deletes its certificate entirely makes the host computer forget it, or disabling, which keeps the pairing on record but flips its access off. That second option, disable, is the entire subject of this post. It's the softer and more reversible of the two, the one you'd reach for when you want to cut someone off without totally nuking the pairing. And it's the one that didn't actually work.

## What this looks like when it goes wrong

Consider a fairly ordinary situation. Let's say someone shares their computer with a romantic partner, and lets them pair a client so they can game on their computer remotely. Now let's say later on they have a falling out, and the owner decides that access should end with it. They open Sunshine, find the paired client, and disable it. Maybe they choose disable over unpair because it feels less drastic, or because they half-expect to reverse it, or simply because the interface offers the switch and the switch reports that the client is now off, but the main point is that to the owner, the client shows as disabled. As far as the owner can tell, the matter is settled for now. **But it isn't.**

If that client had been paired using the exploit I'll describe, what the owner did had absolutely _zero_ effect. The former partner could still connect, with the owner being none the wiser.

This is crazy because a paired Sunshine connection is not a narrow thing to still have. The client sees whatever is on the host's screen and can send keyboard and mouse input, which means the person on the other end is, for practical purposes, sitting at the computer, **meaning that the partner in question could possibly use their browser or any other application to open the owner's email, bank account, etc. if already signed in.**

Thankfully, in order to actually execute this exploit, you need to use a modified client in advance before first pairing to a computer with Sunshine, so it needs to be premeditated. At first that sounds reassuring. However, the premeditation is actually the unsettling part about this caveat. It means the capability belongs to someone who set it up in advance, while they still had legitimate access, anticipating the day they would be cut off. That is close to the exact threat a disable control exists to handle, and it is the case where the control silently did nothing.

## So, what's going on here?

This all comes back to that certificate from earlier, the one that acts as the client's badge once a device is paired. Every time a client connects, Sunshine's entire decision about whether to let it in comes down to taking that badge and finding the matching record in its list of known clients. That sounds simple, and honestly it mostly is, but the catch is in how it does the matching.

An [X.509 certificate](https://en.wikipedia.org/wiki/X.509) is a structured object, but it's usually moved around as PEM format text: Base64 text wrapped in `BEGIN` and `END` lines. A detail that matters here is that the same certificate can be written as PEM in more than one way without changing anything about the certificate itself. The easiest difference to illustrate is line endings: you can have a file that uses Unix line endings (`\n`), or a file that uses Windows line endings (`\r\n`). Since for all intents and purposes, they don't change the actual certificate, a PEM file with either kind of line ending decodes to the identical X.509 certificate.

During pairing, Sunshine takes the PEM the client sends and stores it as it was sent, keeping whatever bytes the client chose, line endings included:

```cpp
sess.client.cert = util::from_hex_vec(get_arg(args, "clientcert"), true);
// ...stored later, unchanged...
named_cert.cert = std::move(cert);
```

When the client later connects over TLS, Sunshine doesn't compare against those stored bytes directly, but parses the presented certificate into an X.509 object and then re-serializes it back into PEM, using its own serializer, which emits Unix line endings, before checking whether the client has been disabled:

```cpp
auto pem = crypto::pem(x509);
if (!is_client_enabled(pem)) {
  return verified;
}
```

So if a client pairs with a certificate encoded using Windows line endings, Sunshine stores the Windows line endings, but every later check reconstructs the certificate with Unix line endings. This is bad because technically those two versions are different text, even though they reference the same core certificate. This is only made worse by the fact that the certificate lookup just compares raw strings, not the encoded X.509 object, which I'm about to get into.

Here is the actual lookup snippet in question:

```cpp
for (const auto &named_cert : client.named_devices) {
  if (named_cert.cert == cert_pem) {
    return named_cert.enabled;
  }
}
return true;
```

There are two fatal decisions here that enable my exploit to work. First is the certificate comparison.
The comparison uses `named_cert.cert == cert_pem`, a verbatim string match, so a record stored with Windows line endings will never match the exact same record with Unix line endings, resulting in the lookup finding nothing. On its own, that would only be a recognition failure, but it gets even worse once we consider the second fatal decision: when no record matches, the function just returns `true` by default. **In other words, an unrecognized certificate doesn't get turned away, but actually gets welcomed in with open arms.** This behavior is the actual vulnerability at play here, tricks like different line endings are just the method to guarantee the lookup never finds the record in order to trigger this faulty behavior.

### How this became part of CVE-2026-111044

I want to be accurate about credit, because the advisory and my report aren't quite the same thing. Independently, another researcher reported a related problem also caused by this flaw, so the Sunshine maintainers consolidated them into a single advisory, [GHSA-6jvv-jqr7-m6m3](https://github.com/LizardByte/Sunshine/security/advisories/GHSA-6jvv-jqr7-m6m3), classified as CWE-863, Incorrect Authorization, which is why the exploit I just described is just a tad bit different from the official advisory description.

## If you run Sunshine

**Update to [v2026.906.222525](https://github.com/LizardByte/Sunshine/releases#release-v2026.906.222525) or later.** And if you ever need to be certain a client can no longer reach your machine, unpair it rather than disabling it. Disabling leaves the pairing on record, and while the patch makes disable trustworthy again, unpairing removes the certificate entirely and leaves nothing behind for the host to get wrong. The most reliable way to revoke access is still to delete the thing you're revoking.

## References

- [GitHub Security Advisory (GHSA-6jvv-jqr7-m6m3)](https://github.com/LizardByte/Sunshine/security/advisories/GHSA-6jvv-jqr7-m6m3)
- [NIST National Vulnerability Database Entry for CVE-2026-111044](https://nvd.nist.gov/vuln/detail/cve-2026-111044)
- [My original disclosure and PoC](https://github.com/rosalgie/vuln-disclosures/tree/master/CVE-2026-111044)
