#!/usr/bin/env node

/*
    Core ts dev guide:
    a) run ts in watch mode using tsc -w or, npm run dev | Ctrl + C to exit mode
    b) after running tsc -w, add new terminal with '+' icon, now you can use git bash while
       previous terminal takes care of watching changes in ts file on each save, or set ts
       watch mode on one terminal & use git bash cli app -> easier to switch
    c) use Prettier
    d) run npm start
*/

/* 
	export PS1="" for MSYS2 and only display the username/host computer name and let console logs take care of App output: Leetcode Diary --> "./path"
	inside a .bashrc this command will run automatically at startup and also manage app title at title bar with PS1
*/

import chalk from "chalk";
// import inquirer from "inquirer";
import { exec, spawn, spawnSync } from "node:child_process";
import * as f from "./modules/file_n_path_ops.js";
import { SQLite3_DB } from "./modules/SQLite3_DB.js";

/* *** main() function below *** */

(async function main() {
	console.log(` ${chalk.bold.underline.green("\nLeetcode Diary")}\n`); // Main App Title

	console.log(chalk.hex("#9C33FF")("h --> help"));

	f.getMemoryLog();
	// console.log("File extension: ", "" === f.getFileExtension("_folder_name")); // returns true
	console.log(`> pwd is ${f.currentDir()}`);

	/* Setup process */

	const programFilesPath = process.env.PROGRAMFILES;
	if (programFilesPath) {
		console.log("Program Files Path:", programFilesPath);
		// f.createDir(f.joinPath(programFilesPath, "Userdata")); // Permission not granted to read and write
	} else {
		console.log("env variable couldn't be set up, alternative setups to be added later");
	}

	const appDataPath = process.env.APPDATA || f.joinPath(f.getUserHomeDirPath(), "AppData", "Roaming"); // %APPDATA% --> user data
	const cachePath = process.env.LOCALAPPDATA || f.joinPath(f.getUserHomeDirPath(), "AppData", "Local"); // %LOCALAPPDATA% --> session cache & autocomplete
	const tmpdirPath = f.getTempDirPath();

	if (appDataPath) {
		f.createDir(f.joinPath(appDataPath, "Leetcodeislife", "Local storage"));
		f.createDir(f.joinPath(appDataPath, "Leetcodeislife", "Session storage")); // unlike "Current session storage" here it's incrementally updated every 5-10 mins
		f.createDir(f.joinPath(appDataPath, "Leetcodeislife", "Network"));
		f.createDir(f.joinPath(appDataPath, "Leetcodeislife", "Local state")); // --> user profile during --> dictionary (database for user info)
		f.createDir(f.joinPath(appDataPath, "Leetcodeislife", "Previous session logs"));
	} else {
		console.log("Setup failed at APPDATA, alternative ways to be added later");
	}

	if (cachePath) {
		f.createDir(f.joinPath(cachePath, "Leetcodeislife", "Current session state")); // engagement record --> user activity analytics
		f.createDir(f.joinPath(cachePath, "Leetcodeislife", "User activity profile"));
		f.createDir(f.joinPath(cachePath, "Leetcodeislife", "Current session variables"));
		f.createDir(f.joinPath(cachePath, "Leetcodeislife", "Current session map"));
		f.createDir(f.joinPath(cachePath, "Leetcodeislife", "Previous session logs")); // a backup copy if in APPDATA not found previous logs
	} else {
		console.log("Setup failed at LOCALAPPDATA, alternative ways to be added later");
	}

	f.createDir(f.joinPath(tmpdirPath, "leetcodeislife", "Current session storage", "log"));
	/* logs stored/updated every few secs, incase of abrupt exit logs remain stored
	there and in the next session logs are automtically recovered if abrupt_exit=true, when 
	session ends it transfers logs from %temp% to previous session logs with dates and time
	of entry (history) (to give user a map of how many things they did between these dates and
	what problems they did) and it clears up the %temp% files */

	const currentDateTime = getLocalDateTime();
	console.log(currentDateTime);

	/* End of setup process */

	/* Event listensers section */

	const listener = new SQLite3_DB.eventEmitter();

	listener.on("db event", (a, b) => console.log(`db event fired with args ${a} and ${b}`));

	/* Event listensers section exit */

	/* Database entry point --> later move .db to %LOCALAPPDATA% & %APPDATA% --> No need to abstract as in if-else in else we can run code on success & is faster */

	// const items = await listItemsInDirectory(`"${dirPath}"`); // <-- working
	// items.forEach((item) => console.log(">> ", item));

	const connection1 = await SQLite3_DB.connect("./db/test.db");
	// const connection1 = await SQLite3_DB.connect("../"); // finally working for db connection failure

	// await simulate_awaited_promise(2000); // not placing await for async fn terminates the program | rest unreachable code

	if (connection1) {
		const table1 = await connection1.TABLE.CREATE_TABLE_IF_NOT_EXISTS("commit_log", {
			sl_no: "INTEGER PRIMARY KEY AUTOINCREMENT",
			username: "TEXT NOT NULL",
			commit_time: "TIME NOT NULL",
			commit_date: "DATE NOT NULL",
			commit_no: "INTEGER NOT NULL",
			line_no: "INTEGER NOT NULL",
			line_string: "TEXT NOT NULL",
			commit_msg: "TEXT DEFAULT NULL",
		}); // it is awaiting

		let line_number = 0;
		// Total insert ops takes about 2:30 minutes for 10,000 lines from the file --> benchmarked locally | but should take 10 secs in highly optimized apps
		// 2:30 minutes for write operation but for reading from table barely 5 seconds

		await table1.fromFileInsertEachRow("../../optimizedsumofprimes.cpp", (line) => {
			line_number += 1;
			table1.insertRow({
				username: "Sahil",
				commit_time: SQLite3_DB.localTime(),
				commit_date: SQLite3_DB.localDate(),
				commit_no: 1,
				line_no: line_number,
				line_string: line,
				commit_msg: null,
			});
		});

		console.log(await table1.select("line_no", "line_string"));

		table1.deleteTable();

		connection1.disconnect();
	}

	if (undefined) {
		/* Record data at external JSON */

		const commitData = f.readJson("./db/commitData.json"); // retrive data as object (key-value pair) from JSON file
		commitData.commit_no += 1; // set the changes to staging
		// commitData.abrupt_exit = !commitData.abrupt_exit; // set the changes to staging
		f.writeJson("./db/commitData.json", commitData); // commit changes to the JSON file --> then resolve the promise
	}

	/* Database exit point */

	/* User input section */

	while (true) {
		process.stdout.write("\n");
		process.stdout.write(chalk.cyanBright("Leetcode Diary") + chalk.yellow(" --> ") + chalk.yellow(process.cwd())); // hex("#9C33FF")
		process.stdout.write("\n");

		const child_terminal_input = await user_input();
		const parsed_input = parse_command(child_terminal_input);
		const command = parsed_input.command;

		if (!command) {
			console.error(chalk.red("No command entered | Type h to view the list of all in-app commands"));
			continue;
		} else if (command === "fire") {
			const default_args = ["default1", "default2"];
			listener.emit("db event", ...(parsed_input.args.length > 0 ? parsed_input.args : default_args));
			continue;
		} else if (command === "exit" || command === "q") {
			listener.removeAllListeners("db event"); // also need to run background processes to ensure cleanup when user abruptly closes the app
			break;
		} else if (command === "pwd") {
			console.log(chalk.cyanBright(process.cwd()));
			continue;
		}

		/* ------------------------------------------------------------------------------------------------------------------------------------- */

		if (command === "h") {
			if (parsed_input.args.length != 0) {
				console.error(chalk.red("Incorrect usage | Type h for help menu"));
				continue;
			}
			console.log(chalk.cyanBright("List of commands: \n"));
			console.log(
				chalk.cyanBright(
					"  build --> builds the executable for a .cpp file that you can execute later using run command"
				)
			);
			console.log(chalk.cyanBright("            build filename.cpp "));
			console.log(chalk.cyanBright("  run   --> builds and runs the executable for .cpp file | run filename.cpp"));
			console.log(
				chalk.redBright(
					"          **Don't run the .exe file directly by typing filename.exe, it won't work as expected"
				)
			);
			console.log(chalk.redBright("            instead use the run command above"));
			console.log(chalk.cyanBright("  cd    --> change directory | advisable to wrap the path in single-quotes '...'"));
			console.log("----------------------------------------------------------------------------------------------");
			console.log(chalk.cyanBright("  q | exit  --> exits the app | recommended way"));
			console.log(chalk.redBright("     **Basic commands of default terminals valid here too"));
			continue;
		}

		// For "cd" command, handle it separately with process.chdir()
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
				} else if (targetDirectory == "-") {
					console.error(chalk.red("Directory quick switch currently unsupported"));
					continue;
				}
				process.chdir(targetDirectory); // not available in worker threads
			} catch (error: any) {
				const errorString = error.message;
				try {
					const [, errorMessage, _fromDirectory, _toDirectory] = errorString.match(
						/ENOENT: (.*), chdir '(.*?)' -> '(.*?)'/
					);
					console.error(chalk.red(errorMessage));
					console.error(
						chalk.red("Tip: use single-quotes to wrap the path containing spaces | cd 'path/to/file name.ext'")
					); // error-message simplifier
				} catch (err) {
					if (err) console.error(chalk.red(errorString));
				} // activates when error-message simplifier fails --> safeguard in place cause error-msg simplifier relies on pattern-matching
			}
		} else if (command == "build") {
			if (parsed_input.args.length == 0) {
				console.error(
					chalk.red("No path provided | To resolve enter the cpp file path --> build path/to/filename.cpp")
				);
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
		} else if (command == "run") {
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

			// Event listener for capturing the output of the child process
			child3.stdout.on("data", (data) => {
				process.stdout.write(data.toString());
			});

			// Event listener for capturing any errors from the child process
			child3.stderr.on("data", (data) => {
				process.stderr.write(chalk.redBright("\nError: " + data.toString()));
			});

			let term_open = true;

			// Event listener for handling the completion of the child process
			child3.on("close", (code) => {
				process.stdout.write(`\nProcess exited with code ${code}, press any key to continue`);
				term_open = false;
			}); // end the while loop when this event fired and use a diff input method to treat entire user input as a string for whitespaces

			while (term_open) {
				const inp = await user_input("", false);
				child3.stdin.write(inp + "\n"); // this \n is necessary as it signals user pressing ENTER
			}

			// no stdin method linked to recieve input for the child process --> no input to cpp file, only output
		} else {
			const child = spawnSync(command, parsed_input.args, { stdio: "pipe" }); // by default runs on cmd.exe

			/* if (process.env.TERM) {
				console.log(`\nCurrent terminal: ${process.env.TERM}\n`); // in git bash spawnSync uses "xterm" terminal | env.TERM does not exists in windows
			} else {
				console.log("\nTerminal information not available.\n");
			} */

			// Convert Buffer objects to strings for stdout and stderr
			const stdout = child.stdout ? child.stdout.toString() : "";
			const stderr = child.stderr ? child.stderr.toString() : "";

			process.stdout.write(chalk.cyanBright(stdout) || chalk.red(stderr));

			if (child.error) {
				if (child.error.message.includes("spawnSync") && child.error.message.includes("ENOENT")) {
					// above condition is checking for no entity (found) error of spawnSync method
					const child_powershell = spawnSync(command, parsed_input.args, { stdio: "pipe", shell: "powershell.exe" });
					// runs on powershell when cmd.exe fails to execute command --> stdio: inherit by default
					// powershell not run by default cause each time shell: "powershell.exe" takes time to setup and execute, while cmd.exe is fast

					/* if (process.env.TERM) {
						console.log(`\nCurrent terminal: ${process.env.TERM}\n`);
					} else {
						console.log("\nTerminal information not available.\n");
					} */

					// Convert Buffer objects to strings for stdout and stderr
					const stdout = child_powershell.stdout ? child_powershell.stdout.toString().trim() : "";
					const stderr = child_powershell.stderr ? child_powershell.stderr.toString().trim() : "";
					process.stdout.write("\n");
					process.stdout.write(chalk.cyanBright(stdout) || chalk.red(stderr));
					process.stdout.write("\n");
					stderr != "" && console.error("\n" + chalk.red(`${command}: unrecognised command | Type h for help`));
				} else {
					console.error(chalk.red("Error:", child.error.message));
				}
			}
		}
	}

	/* User input section end */

	// /* Program exit */
	// process.stdin.destroy(); // destroying any open input stream to properly exit --> working
})();

/* *** End of main() function above *** */

function user_input(prompt?: string, input_guide: boolean = true): Promise<string> {
	return new Promise((resolve) => {
		prompt && process.stdout.write(prompt);
		input_guide && process.stdout.write(">> ");

		const onData = (data: { toString: () => string }) => {
			const userInput = data.toString().trim();
			resolve(userInput);
			cleanup();
		};

		const cleanup = () => {
			// Remove the event listener for "data"
			process.stdin.removeListener("data", onData);
			// Pause the input stream to prevent further data events
			process.stdin.pause();
		};

		// Resume the input stream and add the event listener for "data" once
		const resumeAndAddListener = () => {
			process.stdin.resume();
			process.stdin.once("data", onData);
		};

		// Initially, resume and add the event listener for "data"
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

async function listItemsInDirectory(directory_path: string) {
	try {
		const items = await (function (command: string) {
			return new Promise<string[]>((resolve, reject) => {
				exec(command, (error, stdout, stderr) => {
					if (error) {
						reject(error);
					} else {
						resolve(stdout.trim().split("\n") || stderr);
					}
				});
			});
		})(`ls "${directory_path}"`); // IIFE
		return items.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" })); // case-insensitive sort
	} catch (error: any) {
		console.error("Error listing items:", error.message);
		return [];
	}
}

async function changeDirectory(path: string) {
	try {
		await (function (command: string) {
			return new Promise((resolve, reject) => {
				exec(command, (error, stdout, stderr) => {
					if (error) {
						reject(error);
					} else {
						resolve(stdout || stderr);
					}
				});
			});
		})(`cd "${path}"`); // IIFE
		// console.log(`Changed directory to: ${path}`);
	} catch (error: any) {
		console.error("Error changing directory:", error.message);
	}
}

async function printWorkingDirectory() {
	try {
		const currentDirectory = await (function (command: string) {
			return new Promise<string>((resolve, reject) => {
				exec(command, (error, stdout, stderr) => {
					if (error) {
						reject(error);
					} else {
						resolve(stdout.trim() || stderr);
					}
				});
			});
		})("pwd"); // IIFE
		return currentDirectory;
	} catch (error: any) {
		console.error("Error getting current working directory:", error.message);
		return null;
	}
}

function parse_command(str: string) {
	const arr: string[] = [];
	let i = 0;

	while (i < str.length) {
		if (str[i] === '"') {
			// Handle quoted sections
			i++;
			const endIndex = str.indexOf('"', i);
			if (endIndex !== -1) {
				arr.push(str.substring(i, endIndex));
				i = endIndex + 1;
			}
		} else if (str[i] === "'") {
			// Handle quoted sections
			i++;
			const endIndex = str.indexOf("'", i);
			if (endIndex !== -1) {
				arr.push(str.substring(i, endIndex));
				i = endIndex + 1;
			}
		} else if (str[i] !== " ") {
			// Handle regular sections
			let puff = "";
			while (i < str.length && str[i] !== " " && str[i] !== '"') {
				puff += str[i];
				i++;
			}
			arr.push(puff);
		} else {
			i++;
		}
	}

	const command = arr.shift();

	return {
		command: command,
		args: arr,
	};
}

async function simulate_awaited_promise(time_milliseconds: number) {
	await (() => {
		return new Promise<void>((resolve) => {
			setTimeout(() => {
				console.log(chalk.green(`\n${time_milliseconds} milliseconds period over\n`));
				resolve();
			}, 2000);
		});
	})();
}
