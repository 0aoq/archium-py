function main(a: number, b: number): number {
    function main1(c: number, d: number): number {
        console.log("1", 2);
        console.log("1", 2);
        console.log(1, "2");
        console.log(1, "2");

        function main2(e: number, f: number): number {
            console.log("3", 4);
            console.log("3", 4);
            console.log(3, "4");
            console.log(3, "4");
            return e + f;
        }

        return main2(c, d);
    }

    return main1(a, b);
}

console.log(main(5, 5));
