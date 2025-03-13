OHM Compiler Revamped
Alexander Peluso, Shay Patel, Arjun Manikyath
ReadMe edited 4/5/24

This compiler was implemented primarily with the Ohm code library, with the help
of many online resources regarding Ohm.
To help understand how to use Ohm and how to create the compiler itself, we used resources on the internet such as https://nextjournal.com/pangloss/ohm-parsing-made-easy to help us understand the use cases for Ohm.

Our initial attempt at this compiler had to be reevaluated, and upon some research
and discussion, we found that the method we had used to implement the semantics
the first time did not lend itself very well to expansion for the next part of
the project, which was WASM code generation. In this new iteration, semantics
are fully handled by Ohm's built-in semantic logic which made it easier
to then convert our custom language files into WASM.

All packages necessary to run code/tests can be found in package.json

Instructions for running/compiling code:
`npx tsx src/main.ts tests/FILE_NAME.txt`
- This command will run the test file and produce a result if no errors are present
- Additionally, it will compile a .ts and a .wasm file in the compiled folder

Instructions for running .wasm files:
`wasm-run compiled/FILE_NAME.wasm`
- Make sure you first npm install wasm-run (on Windows systems) with the following command:
`npm install wasm-run -g`
The wasm-run output should match the output of the code ran in the previous step

Information on the grammar rules can be found in both src/parser.ts and grammar.pdf

Information on the final extensions and their justifications can be found in Compiler_Extension_Proposal.txt
