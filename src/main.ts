import { readFileSync } from "fs";
import { parse } from "./parser.ts";
import { Command } from "commander";

const program = new Command();

program
    .version("0.0.1")
    .description("parse")
    .argument("<input>")
    .action((input) => {
        const fileStr = readFileSync(input, "utf-8");
        console.log(parse(fileStr, input));
    })
    .parse(process.argv)
