function inequalityTest(): i32 {
let num: i32 = 0;

if(true != false) {
num = 42;

}

return num;
}
export function main(): i32 {
return inequalityTest();
}
