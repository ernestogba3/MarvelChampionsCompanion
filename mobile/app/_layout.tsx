import { Stack } from 'expo-router';
import { useFonts, BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import {
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
} from '@expo-google-fonts/inter';
import { View, Text } from 'react-native';
import '../global.css';

export default function RootLayout() {
    const [fontsLoaded] = useFonts({
        BebasNeue_400Regular,
        Inter_400Regular,
        Inter_600SemiBold,
        Inter_700Bold,
    });

    if (!fontsLoaded) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <Text>Cargando...</Text>
            </View>
        );
    }

    return <Stack screenOptions={{ headerShown: false }} />;
}