#!/usr/bin/env node
import chalk from "chalk";
import { exec, spawn, spawnSync } from "node:child_process";
import * as f from "./modules/file_n_path_ops.js";
import { SQLite3_DB } from "./modules/SQLite3_DB.js";
(async function main() {
    console.log(` ${chalk.bold.underline.green("\nLeetcode Diary")}\n`);
    console.log(chalk.hex("#9C33FF")("h --> help"));
    f.getMemoryLog();
    console.log(`> pwd is ${f.currentDir()}`);
    const programFilesPath = process.env.PROGRAMFILES;
    if (programFilesPath) {
        console.log("Program Files Path:", programFilesPath);
    }
    else {
        console.log("env variable couldn't be set up, alternative setups to be added later");
    }
    const appDataPath = process.env.APPDATA || f.joinPath(f.getUserHomeDirPath(), "AppData", "Roaming");
    const cachePath = process.env.LOCALAPPDATA || f.joinPath(f.getUserHomeDirPath(), "AppData", "Local");
    const tmpdirPath = f.getTempDirPath();
    if (appDataPath) {
        f.createDir(f.joinPath(appDataPath, "Leetcodeislife", "Local storage"));
        f.createDir(f.joinPath(appDataPath, "Leetcodeislife", "Session storage"));
        f.createDir(f.joinPath(appDataPath, "Leetcodeislife", "Network"));
        f.createDir(f.joinPath(appDataPath, "Leetcodeislife", "Local state"));
        f.createDir(f.joinPath(appDataPath, "Leetcodeislife", "Previous session logs"));
    }
    else {
        console.log("Setup failed at APPDATA, alternative ways to be added later");
    }
    if (cachePath) {
        f.createDir(f.joinPath(cachePath, "Leetcodeislife", "Current session state"));
        f.createDir(f.joinPath(cachePath, "Leetcodeislife", "User activity profile"));
        f.createDir(f.joinPath(cachePath, "Leetcodeislife", "Current session variables"));
        f.createDir(f.joinPath(cachePath, "Leetcodeislife", "Current session map"));
        f.createDir(f.joinPath(cachePath, "Leetcodeislife", "Previous session logs"));
    }
    else {
        console.log("Setup failed at LOCALAPPDATA, alternative ways to be added later");
    }
    f.createDir(f.joinPath(tmpdirPath, "leetcodeislife", "Current session storage", "log"));
    const currentDateTime = getLocalDateTime();
    console.log(currentDateTime);
    const listener = new SQLite3_DB.eventEmitter();
    listener.on("db event", (a, b) => console.log(`db event fired with args ${a} and ${b}`));
    const connection1 = await SQLite3_DB.connect("./db/test.db");
    const commit_log = await connection1?.TABLE.CREATE_TABLE_IF_NOT_EXISTS("commit_log", {
        sl_no: "INTEGER PRIMARY KEY",
        username: "TEXT NOT NULL",
        commit_time: "TIME NOT NULL",
        commit_date: "DATE NOT NULL",
        commit_no: "INTEGER NOT NULL",
        line_no: "INTEGER NOT NULL",
        line_string: "TEXT NOT NULL",
        commit_msg: "TEXT DEFAULT NULL",
    });
    const pre_stage_comparer = await connection1?.TABLE.CREATE_TEMPORARY_TABLE("pre_stage_comparer", {
        id: "INTEGER PRIMARY KEY",
        line_no: "INTEGER NOT NULL",
        line_string: "TEXT NOT NULL",
    });
    let line_number = 0;
    const local_date = SQLite3_DB.localDate();
    const local_time = SQLite3_DB.localTime();
    await pre_stage_comparer?.fromFileInsertEachRow("../../optimizedsumofprimes.cpp", (line) => {
        line_number += 1;
        pre_stage_comparer.insertRow({
            line_no: line_number,
            line_string: line,
        });
    });
    const prev_commit = await connection1?.TABLE.CREATE_TABLE_IF_NOT_EXISTS("prev_commit", {
        id: "INTEGER PRIMARY KEY",
        line_no: "INTEGER NOT NULL",
        line_string: "TEXT NOT NULL",
    });
    const commitData = f.readJson("./db/commitData.json");
    commitData.commit_no += 1;
    f.writeJson("./db/commitData.json", commitData);
    connection1?.dbHandler?.serialize(() => {
        connection1.dbHandler?.run(`
		
		BEGIN TRANSACTION;
	
		-- Compare lines based on line number and insert rows that have different lines between pre_stage_comparer and prev_commit
	
		INSERT INTO commit_log (username, commit_time, commit_date, commit_no, line_no, line_string, commit_msg)
		SELECT "Sahil", ${local_time}, ${local_date}, ${commitData.commit_no}, pre_stage_comparer.line_no, pre_stage_comparer.line_string, NULL
		FROM pre_stage_comparer
		JOIN prev_commit ON pre_stage_comparer.line_no = prev_commit.line_no
		WHERE pre_stage_comparer.line_string <> prev_commit.line_string;
	
		-- Deletes all rows
		DELETE FROM prev_commit;
	
		-- Inserts all rows from pre_stage_comparer to prev_commit
		INSERT INTO prev_commit SELECT * FROM pre_stage_comparer;
	
		COMMIT;
		
		`);
    });
    console.log(await prev_commit?.selectAll());
    await commit_log?.writeFromTableToFile("../../output.txt", (row) => {
        return `[${row.sl_no} | ${row.username} | ${row.commit_time}] | [${row.commit_date}] | ${row.commit_no} | ${row.line_no < 10 ? row.line_no + " " : row.line_no} | ${row.line_string} | ${row.commit_msg}`;
    });
    connection1?.disconnect();
    while (true) {
        process.stdout.write("\n");
        process.stdout.write(chalk.cyanBright("Leetcode Diary") + chalk.yellow(" --> ") + chalk.yellow(process.cwd()));
        process.stdout.write("\n");
        const child_terminal_input = await user_input();
        const parsed_input = parse_command(child_terminal_input);
        const command = parsed_input.command;
        if (!command) {
            console.error(chalk.red("No command entered | Type h to view the list of all in-app commands"));
            continue;
        }
        else if (command === "fire") {
            const default_args = ["default1", "default2"];
            listener.emit("db event", ...(parsed_input.args.length > 0 ? parsed_input.args : default_args));
            continue;
        }
        else if (command === "exit" || command === "q") {
            listener.removeAllListeners("db event");
            break;
        }
        else if (command === "pwd") {
            console.log(chalk.cyanBright(process.cwd()));
            continue;
        }
        if (command === "h") {
            if (parsed_input.args.length != 0) {
                console.error(chalk.red("Incorrect usage | Type h for help menu"));
                continue;
            }
            console.log(chalk.cyanBright("List of commands: \n"));
            console.log(chalk.cyanBright("  build --> builds the executable for a .cpp file that you can execute later using run command"));
            console.log(chalk.cyanBright("            build filename.cpp "));
            console.log(chalk.cyanBright("  run   --> builds and runs the executable for .cpp file | run filename.cpp"));
            console.log(chalk.redBright("          **Don't run the .exe file directly by typing filename.exe, it won't work as expected"));
            console.log(chalk.redBright("            instead use the run command above"));
            console.log(chalk.cyanBright("  cd    --> change directory | advisable to wrap the path in single-quotes '...'"));
            console.log("----------------------------------------------------------------------------------------------");
            console.log(chalk.cyanBright("  q | exit  --> exits the app | recommended way"));
            console.log(chalk.redBright("     **Basic commands of default terminals valid here too"));
            continue;
        }
        if (command === "cd") {
            const targetDirectory = parsed_input.args[0];
            if (parsed_input.args.length == 0) {
                console.error(chalk.red("No path provided | To resolve enter a path --> cd path/to/folderOrFilename.ext"));
                continue;
            }
            try {
                if (targetDirectory == "~") {
                    process.chdir(f.getUserHomeDirPath());
                    continue;
                }
                else if (targetDirectory == "-") {
                    console.error(chalk.red("Directory quick switch currently unsupported"));
                    continue;
                }
                process.chdir(targetDirectory);
            }
            catch (error) {
                const errorString = error.message;
                try {
                    const [, errorMessage, _fromDirectory, _toDirectory] = errorString.match(/ENOENT: (.*), chdir '(.*?)' -> '(.*?)'/);
                    console.error(chalk.red(errorMessage));
                    console.error(chalk.red("Tip: use single-quotes to wrap the path containing spaces | cd 'path/to/file name.ext'"));
                }
                catch (err) {
                    if (err)
                        console.error(chalk.red(errorString));
                }
            }
        }
        else if (command == "build") {
            if (parsed_input.args.length == 0) {
                console.error(chalk.red("No path provided | To resolve enter the cpp file path --> build path/to/filename.cpp"));
                continue;
            }
            const file = f.getFileExtensionAndName(parsed_input.args[0]);
            if (file.extension != "cpp") {
                console.error(chalk.red("Currently can only build .cpp files"));
                continue;
            }
            const child1 = spawnSync("g++", ["-o", `${file.name}.o`, "-c", `${file.name}.cpp`]);
            if (child1.stderr.toString()) {
                console.error(chalk.red("Compilation Error -->\n\n" + child1.stderr.toString()));
                continue;
            }
            const child2 = spawnSync("g++", ["-o", `${file.name}.exe`, `${file.name}.o`]);
            if (child2.stderr.toString()) {
                console.error(chalk.red("Linking Error -->\n\n" + child2.stderr.toString()));
                continue;
            }
            console.log(chalk.greenBright(`Build successfull. To execute the file type run ${file.name}.cpp and ENTER`));
        }
        else if (command == "run") {
            if (parsed_input.args.length == 0) {
                console.error(chalk.red("No path provided | To resolve enter the cpp file path --> run path/to/filename.cpp"));
                continue;
            }
            const file = f.getFileExtensionAndName(parsed_input.args[0]);
            if (file.extension != "cpp") {
                console.error(chalk.red("Currently can only run .cpp files, type run filename.cpp"));
                continue;
            }
            const child1 = spawnSync("g++", ["-o", `${file.name}.o`, "-c", `${file.name}.cpp`]);
            if (child1.stderr.toString()) {
                console.error(chalk.red("Compilation Error -->\n\n" + child1.stderr.toString().trimEnd()));
                continue;
            }
            const child2 = spawnSync("g++", ["-o", `${file.name}.exe`, `${file.name}.o`]);
            if (child2.stderr.toString()) {
                console.error(chalk.red("Linking Error -->\n\n" + child2.stderr.toString().trimEnd()));
                console.error(chalk.redBright("\nTip: Try turning off the currently running .exe file and rerun run command"));
                continue;
            }
            console.log(chalk.greenBright("Build successfully, running...\n"));
            const child3 = spawn(`${file.name}.exe`, { stdio: "pipe" });
            child3.stdout.on("data", (data) => {
                process.stdout.write(data.toString());
            });
            child3.stderr.on("data", (data) => {
                process.stderr.write(chalk.redBright("\nError: " + data.toString()));
            });
            let term_open = true;
            child3.on("close", (code) => {
                process.stdout.write(`\nProcess exited with code ${code}, press any key to continue`);
                term_open = false;
            });
            while (term_open) {
                const inp = await user_input("", false);
                child3.stdin.write(inp + "\n");
            }
        }
        else {
            const child = spawnSync(command, parsed_input.args, { stdio: "pipe" });
            const stdout = child.stdout ? child.stdout.toString() : "";
            const stderr = child.stderr ? child.stderr.toString() : "";
            process.stdout.write(chalk.cyanBright(stdout) || chalk.red(stderr));
            if (child.error) {
                if (child.error.message.includes("spawnSync") && child.error.message.includes("ENOENT")) {
                    const child_powershell = spawnSync(command, parsed_input.args, { stdio: "pipe", shell: "powershell.exe" });
                    const stdout = child_powershell.stdout ? child_powershell.stdout.toString().trim() : "";
                    const stderr = child_powershell.stderr ? child_powershell.stderr.toString().trim() : "";
                    process.stdout.write("\n");
                    process.stdout.write(chalk.cyanBright(stdout) || chalk.red(stderr));
                    process.stdout.write("\n");
                    stderr != "" && console.error("\n" + chalk.red(`${command}: unrecognised command | Type h for help`));
                }
                else {
                    console.error(chalk.red("Error:", child.error.message));
                }
            }
        }
    }
})();
function user_input(prompt, input_guide = true) {
    return new Promise((resolve) => {
        prompt && process.stdout.write(prompt);
        input_guide && process.stdout.write(">> ");
        const onData = (data) => {
            const userInput = data.toString().trim();
            resolve(userInput);
            cleanup();
        };
        const cleanup = () => {
            process.stdin.removeListener("data", onData);
            process.stdin.pause();
        };
        const resumeAndAddListener = () => {
            process.stdin.resume();
            process.stdin.once("data", onData);
        };
        resumeAndAddListener();
    });
}
function getLocalDateTime() {
    const now = new Date();
    const date = now.getDate();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    let period = "AM";
    if (hours >= 12) {
        period = "PM";
        if (hours > 12) {
            hours -= 12;
        }
    }
    return {
        time12hformat: `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
            .toString()
            .padStart(2, "0")} ${period}`,
        time24hformat: now.toLocaleTimeString("en-US", { hour12: false }),
        yyyy_mm_dd: `${year}-${month.toString().padStart(2, "0")}-${date.toString().padStart(2, "0")}`,
        dd_mm_yyyy: `${date.toString().padStart(2, "0")}-${month.toString().padStart(2, "0")}-${year}`,
        dayOfWeek: daysOfWeek[now.getDay()],
    };
}
async function listItemsInDirectory(directory_path) {
    try {
        const items = await (function (command) {
            return new Promise((resolve, reject) => {
                exec(command, (error, stdout, stderr) => {
                    if (error) {
                        reject(error);
                    }
                    else {
                        resolve(stdout.trim().split("\n") || stderr);
                    }
                });
            });
        })(`ls "${directory_path}"`);
        return items.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    }
    catch (error) {
        console.error("Error listing items:", error.message);
        return [];
    }
}
async function changeDirectory(path) {
    try {
        await (function (command) {
            return new Promise((resolve, reject) => {
                exec(command, (error, stdout, stderr) => {
                    if (error) {
                        reject(error);
                    }
                    else {
                        resolve(stdout || stderr);
                    }
                });
            });
        })(`cd "${path}"`);
    }
    catch (error) {
        console.error("Error changing directory:", error.message);
    }
}
async function printWorkingDirectory() {
    try {
        const currentDirectory = await (function (command) {
            return new Promise((resolve, reject) => {
                exec(command, (error, stdout, stderr) => {
                    if (error) {
                        reject(error);
                    }
                    else {
                        resolve(stdout.trim() || stderr);
                    }
                });
            });
        })("pwd");
        return currentDirectory;
    }
    catch (error) {
        console.error("Error getting current working directory:", error.message);
        return null;
    }
}
function parse_command(str) {
    const arr = [];
    let i = 0;
    while (i < str.length) {
        if (str[i] === '"') {
            i++;
            const endIndex = str.indexOf('"', i);
            if (endIndex !== -1) {
                arr.push(str.substring(i, endIndex));
                i = endIndex + 1;
            }
        }
        else if (str[i] === "'") {
            i++;
            const endIndex = str.indexOf("'", i);
            if (endIndex !== -1) {
                arr.push(str.substring(i, endIndex));
                i = endIndex + 1;
            }
        }
        else if (str[i] !== " ") {
            let puff = "";
            while (i < str.length && str[i] !== " " && str[i] !== '"') {
                puff += str[i];
                i++;
            }
            arr.push(puff);
        }
        else {
            i++;
        }
    }
    const command = arr.shift();
    return {
        command: command,
        args: arr,
    };
}
async function simulate_awaited_promise(time_milliseconds) {
    await (() => {
        return new Promise((resolve) => {
            setTimeout(() => {
                console.log(chalk.green(`\n${time_milliseconds} milliseconds period over\n`));
                resolve();
            }, 2000);
        });
    })();
}
