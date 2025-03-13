function comparisonTest(): i32 {
let i: i32 = 0;

if(2 > 1) {
i = 41;

}

if(2 >= 1) {
i = 42;

}

if(2 < 1) {
i = 43;

}

if(2 <= 1) {
i = 44;

}

return i;
}
export function main(): i32 {
return comparisonTest();
}
