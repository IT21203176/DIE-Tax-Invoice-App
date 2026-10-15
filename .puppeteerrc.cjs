// On Vercel the PDF uses @sparticuz/chromium, so skip Puppeteer's own Chrome download during the build.
module.exports = {
  skipDownload: Boolean(process.env.VERCEL),
};
