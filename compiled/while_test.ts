function whileTest(): i32 {
let num: i32 = 0;

while(num < 42) { 
num = 42;

}

return num;
}
export function main(): i32 {
return whileTest();
}
