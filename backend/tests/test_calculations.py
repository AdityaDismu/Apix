import math
from index_engine.calculations import *
def test_relative(): assert calculate_price_relative(5500,5000)==1.1
def test_jevons(): assert round(calculate_jevons_from_relatives([1.1,0.9]),6)==round(math.sqrt(.99)*100,6)
def test_weighted(): assert round(calculate_weighted_jevons([100,110],[1,1]),6)==round(math.sqrt(1.1)*100,6)
def test_invalid():
    try: calculate_price_relative(0,100); assert False
    except ValueError: pass
