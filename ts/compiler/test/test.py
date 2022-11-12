class test:
    def __init__(self, a):
        self.a = a
        print("aaa")


    def method(self, ):
        return "Hello, world! " + self.a;



t = test("A")
print(t.method())
def add(a, b):
    return a + b;

t = test("B")
print(add(5, 10))
