// js/shortcuts.js
// Seed data. Ids are stable — never renumber existing entries.
// Add new entries at end of arrays.

export default [
  {
    id: "cat-main",
    category: "Main",
    color: "yellow",
    icon: "home",
    items: [
      {
        id: "lnk-gmail",
        name: "gmail",
        url: "https://mail.google.com/mail/u/0/#inbox",
      },
      {
        id: "lnk-facebook",
        name: "facebook",
        url: "https://www.facebook.com/",
      },
      { id: "lnk-twitter", name: "twitter", url: "https://twitter.com" },
      { id: "lnk-google", name: "google", url: "https://www.google.com/" },
      {
        id: "lnk-proton",
        name: "proton",
        url: "https://account.protonvpn.com/dashboardV2",
      },
    ],
  },
  {
    id: "cat-dev",
    category: "Dev",
    color: "cyan",
    icon: "code",
    items: [
      { id: "lnk-github", name: "github", url: "https://github.com/Bigu93" },
      { id: "lnk-devto", name: "dev.to", url: "https://dev.to" },
      { id: "lnk-devdocs", name: "docs", url: "https://devdocs.io/" },
      {
        id: "lnk-idosell-npm",
        name: "idosell-npm",
        url: "https://www.npmjs.com/package/idosell",
      },
      {
        id: "lnk-idosell-doc",
        name: "idosell-doc",
        url: "https://idosell-converter.vercel.app/",
      },
    ],
  },
  {
    id: "cat-courses",
    category: "Courses",
    color: "cyan",
    icon: "graduation-cap",
    items: [
      {
        id: "lnk-xss-rat",
        name: "xss_rat",
        url: "https://thexssrat.podia.com/",
      },
      {
        id: "lnk-docker-lab",
        name: "docker",
        url: "https://labs.iximiuz.com/dashboard",
      },
      { id: "lnk-courses-docs", name: "docs", url: "https://devdocs.io/" },
    ],
  },
  {
    id: "cat-ai",
    category: "AI",
    color: "blue",
    icon: "cpu",
    items: [
      { id: "lnk-chatgpt", name: "ChatGPT", url: "https://chatgpt.com/" },
      {
        id: "lnk-perplexity",
        name: "Perplexity",
        url: "https://www.perplexity.ai/",
      },
      { id: "lnk-claude", name: "Claude", url: "https://claude.ai/new" },
      {
        id: "lnk-gemini",
        name: "Gemini",
        url: "https://gemini.google.com/app",
      },
      {
        id: "lnk-deepseek",
        name: "DeepSeek",
        url: "https://chat.deepseek.com/",
      },
      {
        id: "lnk-ai-studio",
        name: "Google AI studio",
        url: "https://aistudio.google.com/",
      },
      { id: "lnk-glm", name: "GLM", url: "https://chat.z.ai/" },
    ],
  },
  {
    id: "cat-h4ck1ng",
    category: "H4ck1ng",
    color: "red",
    icon: "terminal",
    items: [
      {
        id: "lnk-tryhackme",
        name: "tryhackme",
        url: "https://tryhackme.com/dashboard",
      },
      {
        id: "lnk-hackthebox",
        name: "hackthebox",
        url: "https://app.hackthebox.com/home",
      },
      {
        id: "lnk-ine",
        name: "ine",
        url: "https://my.ine.com/dashboard/learning",
      },
      {
        id: "lnk-pwn-college",
        name: "pwn.college",
        url: "https://pwn.college/",
      },
      {
        id: "lnk-hacktricks",
        name: "hacktricks",
        url: "https://book.hacktricks.xyz/welcome/readme",
      },
      {
        id: "lnk-hackersploit",
        name: "hackersploit",
        url: "https://hackersploit.org/penetration-testing-tutorials/",
      },
      {
        id: "lnk-cryptohack",
        name: "cryptohack",
        url: "https://cryptohack.org/",
      },
      {
        id: "lnk-hacking-articles",
        name: "hacking articles",
        url: "https://www.hackingarticles.in/",
      },
    ],
  },
  {
    id: "cat-work",
    category: "Work",
    color: "green",
    icon: "briefcase",
    items: [
      { id: "lnk-trello", name: "trello", url: "https://trello.com" },
      { id: "lnk-linkedin", name: "linkedin", url: "https://linkedin.com" },
      {
        id: "lnk-buto-panel",
        name: "buto panel",
        url: "https://butosklep.pl/panel",
      },
      {
        id: "lnk-bing-ads",
        name: "bing ads",
        url: "https://ui.ads.microsoft.com/campaign/vnext/overview",
      },
    ],
  },
  {
    id: "cat-fun",
    category: "Fun",
    color: "purple",
    icon: "gamepad-2",
    items: [
      { id: "lnk-wykop", name: "wykop", url: "https://wykop.pl/" },
      { id: "lnk-youtube", name: "youtube", url: "https://www.youtube.com/" },
      { id: "lnk-twitch", name: "twitch", url: "https://www.twitch.tv/" },
      {
        id: "lnk-pepper",
        name: "pepper",
        url: "https://www.pepper.pl/dlaciebie",
      },
      { id: "lnk-ytmusic", name: "ytmusic", url: "https://music.youtube.com/" },
      { id: "lnk-ggdeals", name: "ggdeals", url: "https://gg.deals/" },
      {
        id: "lnk-torrent",
        name: "torrent",
        url: "https://polskie-torrenty.eu/",
      },
      { id: "lnk-xtorrent", name: "xtorrent", url: "https://xtorrenty.org/" },
    ],
  },
  {
    id: "cat-info",
    category: "Info",
    color: "green",
    icon: "newspaper",
    items: [
      { id: "lnk-tugazeta", name: "tugazeta", url: "https://tugazeta.pl/" },
      { id: "lnk-sekurak", name: "sekurak", url: "https://sekurak.pl/" },
      {
        id: "lnk-world-news",
        name: "world_news",
        url: "https://brutalist.report/topic/news?limit=5",
      },
      {
        id: "lnk-tech-news",
        name: "tech_news",
        url: "https://brutalist.report/topic/tech?limit=10",
      },
      {
        id: "lnk-business-news",
        name: "business_news",
        url: "https://brutalist.report/topic/business?limit=10",
      },
      {
        id: "lnk-gaming-news",
        name: "gaming_news",
        url: "https://brutalist.report/topic/gaming?limit=10",
      },
      {
        id: "lnk-r-polska",
        name: "/r/polska",
        url: "https://www.reddit.com/r/Polska/",
      },
    ],
  },
  {
    id: "cat-shopping",
    category: "Shopping",
    color: "cyan",
    icon: "shopping-cart",
    items: [
      { id: "lnk-allegro", name: "allegro", url: "https://allegro.pl/" },
      { id: "lnk-olx", name: "olx", url: "https://www.olx.pl/" },
      { id: "lnk-etsy", name: "etsy", url: "https://www.etsy.com/" },
      { id: "lnk-emp-shop", name: "emp-shop", url: "https://www.emp-shop.pl/" },
      {
        id: "lnk-rockmetalshop",
        name: "rockmetalshop",
        url: "https://rockmetalshop.pl/",
      },
      { id: "lnk-kfd", name: "kfd", url: "https://sklep.kfd.pl/" },
    ],
  },
  {
    id: "cat-gaming",
    category: "Gaming",
    color: "blue",
    icon: "joystick",
    items: [
      {
        id: "lnk-r-gaming",
        name: "/r/gaming",
        url: "https://www.reddit.com/r/gaming/",
      },
      {
        id: "lnk-gry-online",
        name: "gry-online",
        url: "https://www.gry-online.pl/",
      },
      { id: "lnk-gog", name: "gog", url: "https://www.gog.com/" },
      {
        id: "lnk-steam",
        name: "steam",
        url: "https://store.steampowered.com/",
      },
    ],
  },
  {
    id: "cat-vip",
    category: "VIP List",
    color: "light-gray",
    icon: "star",
    items: [
      {
        id: "lnk-gynvael",
        name: "gynvael",
        url: "https://gynvael.coldwind.pl/",
      },
      {
        id: "lnk-network-chuck",
        name: "network_chuck",
        url: "https://learn.networkchuck.com/",
      },
      {
        id: "lnk-ippsec",
        name: "ippsec",
        url: "https://www.youtube.com/@ippsec/videos",
      },
      {
        id: "lnk-hammond",
        name: "hammond",
        url: "https://www.youtube.com/@_JohnHammond/videos",
      },
    ],
  },
  {
    id: "cat-homelab",
    category: "Home lab",
    color: "green",
    icon: "server",
    items: [
      {
        id: "lnk-homelab-dashboard",
        name: "homelab dashboard",
        url: "http://dashboard.lan",
      },
      { id: "lnk-bookmarks", name: "bookmarks", url: "http://linkding.lan" },
      { id: "lnk-dns", name: "dns", url: "http://adguard.lan" },
      { id: "lnk-proxy", name: "proxy manager", url: "http://nginx.lan" },
      {
        id: "lnk-cyberchef-lan",
        name: "cyberchef",
        url: "http://cyberchef.lan",
      },
      { id: "lnk-speedtest", name: "speedtest", url: "http://speed.lan" },
      { id: "lnk-portainer", name: "portainer", url: "http://portainer.lan" },
      { id: "lnk-torrent-lan", name: "torrent", url: "http://torrent.lan" },
      { id: "lnk-gitea", name: "gitea", url: "http://gitea.lan" },
      { id: "lnk-n8n", name: "n8n", url: "http://n8n.lan" },
    ],
  },
  {
    id: "cat-ctfs",
    category: "CTFs",
    color: "red",
    icon: "flag",
    items: [
      {
        id: "lnk-cyberchef",
        name: "CyberChef",
        url: "https://gchq.github.io/CyberChef/",
      },
      { id: "lnk-hex", name: "Hex", url: "https://hexed.it/" },
      {
        id: "lnk-online-converter",
        name: "OnlineConverter",
        url: "https://www.rapidtables.com/convert/number/ascii-hex-bin-dec-converter.html",
      },
      { id: "lnk-xor", name: "XOR", url: "https://xor.pw/" },
      { id: "lnk-regex", name: "Regex", url: "https://www.debuggex.com/" },
      { id: "lnk-ascii", name: "ASCII", url: "https://www.asciitable.com/" },
      { id: "lnk-quipquip", name: "QuipQuip", url: "https://quipqiup.com/" },
      {
        id: "lnk-crackstation",
        name: "Crackstation",
        url: "https://crackstation.net/",
      },
      {
        id: "lnk-pentestbook",
        name: "PentestBook",
        url: "https://pentestbook.six2dez.com/",
      },
      {
        id: "lnk-practical-ctf",
        name: "Practical CTF",
        url: "https://book.jorianwoltjer.com/",
      },
      {
        id: "lnk-john-ermac",
        name: "john_ermac",
        url: "https://johnermac.github.io/menu/",
      },
    ],
  },
  {
    id: "cat-pentest-knowledge",
    category: "Pentest knowledge",
    color: "gray",
    icon: "shield",
    items: [
      {
        id: "lnk-nthw",
        name: "NTHW",
        url: "https://github.com/notthehiddenwiki/NTHW",
      },
      {
        id: "lnk-exploit-notes",
        name: "Exploit notes",
        url: "https://exploit-notes.hdks.org/",
      },
      {
        id: "lnk-security-links",
        name: "SecurityLinks",
        url: "https://security-links.hdks.org/",
      },
      {
        id: "lnk-praetorian",
        name: "Praetorian",
        url: "https://www.praetorian.com/blog/",
      },
      {
        id: "lnk-hibp",
        name: "haveibeenpwned",
        url: "https://haveibeenpwned.com/",
      },
      {
        id: "lnk-r-blackhat",
        name: "/r/blackhat",
        url: "https://www.reddit.com/r/blackhat/?rdt=35278",
      },
      {
        id: "lnk-zenarmor",
        name: "zenarmor",
        url: "https://www.zenarmor.com/docs/network-security-tutorials/best-firewalls-for-schools",
      },
      { id: "lnk-cuckoo", name: "cuckoo", url: "https://sandbox.pikker.ee/" },
      {
        id: "lnk-canary-tokens",
        name: "canary_tokens",
        url: "https://canarytokens.org/nest/",
      },
      {
        id: "lnk-html-spec",
        name: "HTML Standard",
        url: "https://html.spec.whatwg.org/multipage/parsing.html",
      },
      {
        id: "lnk-webgoat",
        name: "WebGoat",
        url: "https://github.com/WebGoat/WebGoat?tab=readme-ov-file",
      },
      {
        id: "lnk-mxss-cheat",
        name: "mXSS cheatsheet",
        url: "https://sonarsource.github.io/mxss-cheatsheet/",
      },
      {
        id: "lnk-owasp-cheat",
        name: "OWASP cheatsheet",
        url: "https://cheatsheetseries.owasp.org/index.html",
      },
      {
        id: "lnk-haax-cheat",
        name: "Offensive Sec cheatsheet",
        url: "https://cheatsheet.haax.fr/",
      },
      {
        id: "lnk-xss-rat-notes",
        name: "XSS rat",
        url: "https://thexssrat.notion.site/Uncle-rat-s-notes-0ca25196b8c84147bf35a5c84d6b18de",
      },
      {
        id: "lnk-awesome-bugbounty",
        name: "Awesome BugBounty",
        url: "https://github.com/fardeen-ahmed/Bug-bounty-Writeups",
      },
      {
        id: "lnk-hacker-recipes",
        name: "HackerRecipes",
        url: "https://www.thehacker.recipes/",
      },
      {
        id: "lnk-red-team-notes",
        name: "Red Team Notes",
        url: "https://www.ired.team/",
      },
      {
        id: "lnk-red-team-llm",
        name: "Red Team LLM",
        url: "https://cph-sec.gitbook.io/ai-llm-red-team-handbook-and-field-manual",
      },
    ],
  },
  {
    id: "cat-sport",
    category: "Sport",
    color: "purple",
    icon: "activity",
    items: [
      {
        id: "lnk-buganski",
        name: "Bugański",
        url: "https://czlowiekuruszsie.pl/",
      },
    ],
  },
  {
    id: "cat-books",
    category: "Books & Knowledge",
    color: "blue",
    icon: "book",
    items: [
      {
        id: "lnk-annas-archive",
        name: "Anna's Archive",
        url: "https://pl.annas-archive.org/",
      },
      { id: "lnk-btdigg", name: "BTDigg", url: "https://btdig.com/" },
      {
        id: "lnk-libgen-fiction",
        name: "Polish fiction",
        url: "https://libgen.is/fiction/?q=&criteria=&language=Polish&format=",
      },
      {
        id: "lnk-libgen-nonfiction",
        name: "Polish non-fiction",
        url: "https://libgen.is/search.php?&req=polish&phrase=1&view=simple&column=language&sort=id&sortmode=DESC",
      },
      {
        id: "lnk-libgen-it",
        name: "Polish IT",
        url: "https://libgen.is/search.php?&req=Helion&phrase=1&view=simple&column=publisher&sort=id&sortmode=DESC&page=2",
      },
    ],
  },
];
