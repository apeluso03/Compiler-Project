function disjunctionTest(): bool {
let b: bool = false;

if(true | false) {
b = true;

}

return b;
}
export function main(): bool {
return disjunctionTest();
}
