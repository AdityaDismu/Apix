import math


def mae(errors):
    return sum(abs(x) for x in errors)/len(errors) if errors else None

def rmse(errors):
    return math.sqrt(sum(x*x for x in errors)/len(errors)) if errors else None

def mape(predicted, actual):
    vals=[abs((p-a)/a)*100 for p,a in zip(predicted,actual) if a != 0]
    return sum(vals)/len(vals) if vals else None

def correlation(x,y):
    if len(x)<2 or len(x)!=len(y): return None
    mx=sum(x)/len(x); my=sum(y)/len(y)
    num=sum((a-mx)*(b-my) for a,b in zip(x,y))
    dx=math.sqrt(sum((a-mx)**2 for a in x)); dy=math.sqrt(sum((b-my)**2 for b in y))
    return num/(dx*dy) if dx and dy else None
