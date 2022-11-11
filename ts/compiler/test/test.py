def main(a, b):
    def main1(c, d):
        print("1", 2)
        print("1", 2)
        print(1, "2")
        print(1, "2")
        def main2(e, f):
            print("3", 4)
            print("3", 4)
            print(3, "4")
            print(3, "4")
            return e + f;

        return main2(c, d);

    return main1(a, b);

print(main(5, 5))
