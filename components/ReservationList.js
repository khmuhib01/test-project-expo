import React, {useEffect, useState, useCallback} from 'react';
import {View, Text, FlatList, StyleSheet, ActivityIndicator} from 'react-native';
import {useSelector, useDispatch} from 'react-redux';
import ReservationCard from './ReservationCard';
import {getGuestReservationInfo} from './../lib/api';
import {getToken, clearToken} from './../lib/storage'; // Assuming you have these storage functions

export default function ReservationList({filterType, onView, onAction, showOnlyViewButton, onUpdateCounts}) {
	const [reservations, setReservations] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const storeRestaurantId = useSelector((state) => state.user?.user?.res_uuid);
	const isAuthenticated = useSelector((state) => state.user?.isAuthenticated);
	const dispatch = useDispatch();

	const formatDate = (dateObj) => {
		const day = dateObj.getDate().toString().padStart(2, '0');
		const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
		const year = dateObj.getFullYear();
		return `${day}/${month}/${year}`;
	};

	const parseDate = (dateString) => {
		const [day, month, year] = dateString.split('/').map(Number);
		return new Date(year, month - 1, day);
	};

	const filterReservations = useCallback((reservations, type) => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		return reservations.filter((res) => {
			try {
				const resDate = parseDate(res.reservation_date);
				if (type === 'today') {
					return resDate.getTime() === today.getTime();
				} else {
					return resDate > today;
				}
			} catch (e) {
				console.error('Error parsing date:', res.reservation_date, e);
				return false;
			}
		});
	}, []);

	const refreshReservations = useCallback(async () => {
		if (!isAuthenticated) {
			console.log('User not authenticated - skipping refresh');
			return;
		}

		if (!storeRestaurantId) {
			console.log('No restaurant ID available - skipping refresh');
			return;
		}

		try {
			setRefreshing(true);

			const token = await getToken();

			if (!token) {
				console.log('No token available - forcing logout');
				handleLogout();
				return;
			}

			const response = await getGuestReservationInfo(storeRestaurantId);

			const allReservations = response?.data?.data || [];

			if (onUpdateCounts) {
				onUpdateCounts(allReservations);
			}

			const filtered = filterReservations(allReservations, filterType);
			setReservations(filtered);
		} catch (error) {
			console.error('Error refreshing reservations:', error);

			// Handle unauthorized error (401)
			if (error.response?.status === 401) {
				console.log('Authentication failed - forcing logout');
				handleLogout();
			}
		} finally {
			setRefreshing(false);
			setIsLoading(false);
		}
	}, [storeRestaurantId, filterType, filterReservations, onUpdateCounts, isAuthenticated]);

	useEffect(() => {
		if (isAuthenticated && storeRestaurantId) {
			refreshReservations();
		}
	}, [refreshReservations, isAuthenticated, storeRestaurantId]);

	const handleAction = (action, reservationId) => {
		onAction(action, reservationId);
	};

	const handleView = (item) => {
		onView(item);
	};

	if (!isAuthenticated) {
		return (
			<View style={styles.emptyContainer}>
				<Text style={styles.emptyText}>Please login to view reservations</Text>
			</View>
		);
	}

	if (isLoading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color="#C1272D" />
				<Text style={styles.loadingText}>Loading reservations...</Text>
			</View>
		);
	}

	if (reservations.length === 0) {
		return (
			<View style={styles.emptyContainer}>
				<Text style={styles.emptyText}>
					{filterType === 'today' ? 'No reservations for today' : 'No upcoming reservations'}
				</Text>
			</View>
		);
	}

	return (
		<FlatList
			data={reservations}
			keyExtractor={(item) => item.uuid || item.id?.toString()}
			renderItem={({item}) => (
				<ReservationCard
					item={item}
					onAccept={() => handleAction('accept', item.uuid)}
					onReject={() => handleAction('reject', item.uuid)}
					onCancel={() => handleAction('cancel', item.uuid)}
					onCheckIn={() => handleAction('checkin', item.uuid)}
					onCheckOut={() => handleAction('checkout', item.uuid)}
					onView={() => handleView(item)}
					showOnlyViewButton={showOnlyViewButton}
				/>
			)}
			contentContainerStyle={styles.listContainer}
			refreshing={refreshing}
			onRefresh={refreshReservations}
		/>
	);
}

const styles = StyleSheet.create({
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	loadingText: {
		marginTop: 10,
		color: '#666',
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	emptyText: {
		color: '#888',
		fontSize: 16,
	},
	listContainer: {
		padding: 16,
	},
});
