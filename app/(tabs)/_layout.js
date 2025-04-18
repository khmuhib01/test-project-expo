import {Tabs} from 'expo-router';
import {Ionicons} from '@expo/vector-icons';
import {getToken} from '../../lib/storage';
import {useEffect, useState} from 'react';
import {router} from 'expo-router';

export default function TabLayout() {
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const checkAuth = async () => {
			const token = await getToken();
			if (!token) {
				router.replace('/'); // Go back to login if no token
			}
			setLoading(false);
		};
		checkAuth();
	}, []);

	if (loading) return null;

	return (
		<Tabs screenOptions={{headerShown: false}}>
			<Tabs.Screen
				name="home"
				options={{
					title: 'Home',
					tabBarIcon: ({color}) => <Ionicons name="home" color={color} size={24} />,
				}}
			/>
			<Tabs.Screen
				name="settings"
				options={{
					title: 'Settings',
					tabBarIcon: ({color}) => <Ionicons name="settings" color={color} size={24} />,
				}}
			/>
		</Tabs>
	);
}
