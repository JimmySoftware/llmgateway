// Example of better .env loading that always uses root .env

// Instead of:
// import "dotenv/config";

// Use:
import dotenv from "dotenv";
import path from "path";

// Always load from the root directory
dotenv.config({
	path: path.resolve(__dirname, "../../.env"),
});

// Or for apps:
// dotenv.config({
//   path: path.resolve(__dirname, "../../../.env")
// });

console.log("This approach ensures all apps use the same root .env file");
