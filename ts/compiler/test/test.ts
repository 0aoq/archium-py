class test {
    a: string;

    constructor(a: string) {
        this.a = a;
        console.log("aaa")
    }

    public method() {
        return "Hello, world! " + this.a;
    }   
}

let t = new test("A");
console.log(t.method());

function add(a: number, b: number): number {
    return a + b;
}

t = new test("B");

console.log(add(5, 10))