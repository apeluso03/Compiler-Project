function conjunctionTest(): bool {
let b: bool = true;

if(true & true) {
b = false;

}

return b;
}
export function main(): bool {
return conjunctionTest();
}
