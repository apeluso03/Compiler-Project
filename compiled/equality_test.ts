function testEquality(): bool {
let flag: bool = false;

if(true == false) {
flag = true;

}

return flag;
}
export function main(): bool {
return testEquality();
}
