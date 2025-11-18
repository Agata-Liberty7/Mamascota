import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';

export default function StartScreen() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Cloud of tag</Text>

      <TouchableOpacity
        onPress={() =>
          router.replace({ pathname: '/animal-selection', params: { from: 'tag-cloud' } })
        }
        style={{
          marginTop: 24,
          paddingVertical: 10,
          paddingHorizontal: 16,
          backgroundColor: '#eee',
          borderRadius: 8,
        }}
      >
        <Text style={{ fontSize: 16 }}>← Назад к выбору животного</Text>
      </TouchableOpacity>
    </View>
  );
}
