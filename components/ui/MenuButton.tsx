import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import BurgerMenu from "./BurgerMenu";

export default function MenuButton() {
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.button}>
        <Text style={styles.icon}>☰</Text>
      </TouchableOpacity>

      <BurgerMenu visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 50,
    alignSelf: "center",
    zIndex: 999,
  },
  button: {
    padding: 10,
  },
  icon: {
    fontSize: 24,
  },
});
