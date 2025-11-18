import React, { ReactNode } from 'react';
import {
    Modal,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import i18n from '../../i18n';
import { theme } from '../../src/theme';


type Props = {
  visible: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
  animationType?: 'none' | 'slide' | 'fade';
};

export default function AppModal({
  visible,
  title,
  onClose,
  children,
  animationType = 'slide',
}: Props) {
  return (
    <Modal visible={visible} animationType={animationType} onRequestClose={onClose}>
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title}>{title ?? ''}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.close}>
                {i18n.t('menu.close') ?? i18n.t('common.close') ?? i18n.t('close') ?? 'Close'}
            </Text>
            </Pressable>

        </View>
        <ScrollView contentContainerStyle={styles.content}>
          {children}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: theme.colors.textPrimary },
  close: { fontSize: 14, textDecorationLine: 'underline', color: theme.colors.textPrimary },
  content: { padding: 16, gap: 14 },
});
