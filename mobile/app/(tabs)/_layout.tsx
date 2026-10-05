import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: { backgroundColor: '#0B1F3B', borderTopColor: 'rgba(245,241,230,0.1)' },
                tabBarActiveTintColor: '#D4AF37',
                tabBarInactiveTintColor: '#6B7280',
                tabBarLabelStyle: { fontSize: 11 },
            }}
        >
            <Tabs.Screen
                name="game"
                options={{
                    title: 'Partida',
                    tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="cards"
                options={{
                    title: 'Cartas',
                    tabBarIcon: ({ color, size }) => <Ionicons name="albums" color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="rules"
                options={{
                    title: 'Reglas',
                    tabBarIcon: ({ color, size }) => <Ionicons name="book" color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="collection"
                options={{
                    title: 'Colección',
                    tabBarIcon: ({ color, size }) => <Ionicons name="grid" color={color} size={size} />,
                }}
            />
            <Tabs.Screen
                name="more"
                options={{
                    title: 'Más',
                    tabBarIcon: ({ color, size }) => <Ionicons name="ellipsis-horizontal" color={color} size={size} />,
                }}
            />
        </Tabs>
    );
}