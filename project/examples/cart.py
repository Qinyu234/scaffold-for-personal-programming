cart_total: int = 0

def add_item(price):
    global cart_total
    cart_total += price

def remove_item(price):
    global cart_total
    cart_total -= price

def show_total():
    return cart_total
