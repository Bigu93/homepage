import executor from "./executors.js";

export default [
  {
    name: ["search", "s"],
    description: "Searches DuckDuckGo for the given query",
    execute: executor.search,
  },
  {
    name: ["ls"],
    description: "Lists available shortcuts",
    execute: executor.ls,
  },
  {
    name: ["help"],
    description: "Lists available commands",
    execute: executor.help,
  },
  {
    name: ["clear", "cls"],
    description: "Clears the output history",
    execute: executor.clear,
  },
  {
    name: ["weather"],
    description: "Displays the weather forecast",
    execute: executor.weather,
  },
  {
    name: ["motd"],
    description: "Displays a random famous quote",
    execute: (args) => executor.motd(args),
  },
  {
    name: ["whoami"],
    description: "Displays secret name",
    execute: executor.whoami,
  },
];
