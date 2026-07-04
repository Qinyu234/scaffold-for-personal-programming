int cartTotal = 0;

void addItem(int price) {
    cartTotal += price;
}

void removeItem(int price) {
    cartTotal -= price;
}

int showTotal() {
    return cartTotal;
}
