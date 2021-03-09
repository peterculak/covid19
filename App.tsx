import React, {useEffect, useState, useRef} from 'react';
import {Image, StyleSheet, Text, View, Switch} from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import {Hospital, ockovanie} from "./Ockovanie";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState<any>(false);
  const notificationListener: any = useRef();
  const responseListener: any = useRef();
  const [hospitals, setHospitals] = useState<Array<Hospital>>([]);
  const [count, setCounter] = useState<number>(0);
  const [started, setStarted] = useState<boolean>(false);
  const [bgTaskEnabled, setBgTaskEnabled] = useState<boolean>(false);

  const countRef = useRef(count);
  countRef.current = count;

  const startedRef = useRef(started);
  startedRef.current = started;

  const unregisterBackgroundTask = async () => {
    const isRegisterdFetch = await TaskManager.isTaskRegisteredAsync(
      BACKGROUND_FETCH_TASK
    );
    if (isRegisterdFetch) {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
      console.log('unregistered background task');
    }
  };

  useEffect(() => {
    console.log('useEffect');
    console.log(`Length: ${hospitals.length}`);
    if (!hospitals.length) {
      refresh();
    }
  }, [hospitals.length]);

  useEffect(() => {
    registerBackgroudTask();
    setBgTaskEnabled(true);
  }, []);

  const start = () => {
    setStarted(true);
    setHospitals([]);
    setTimeout(() => refresh(), 0);
  }

  const stop = () => {
    setStarted(false);
    setHospitals([]);
  }

  const toggleFrontTask = () => {
    if (started) {
      stop();
    } else {
      start();
    }
  }

  const toggleBackgroundTask = () => {
    if (bgTaskEnabled) {
      setBgTaskEnabled(false);
      unregisterBackgroundTask();
    } else {
      setBgTaskEnabled(true);
      registerBackgroudTask();
    }
  }

  const refresh = () => {
    console.log('refresh');
    console.log(startedRef.current);
    if (startedRef.current) {
      console.log(`waiting ${countRef.current} time`);
      const newCount = countRef.current + 1;
      setCounter(newCount);
      setTimeout(() => {
        console.log('fetching');
        ockovanie(
          Constants.manifest.extra.url,
          Constants.manifest.extra.cities.split(','),
          Constants.manifest.extra.ageFrom,
          Constants.manifest.extra.ageTo,
        )
          .then((hospitals: Array<Hospital>) => {
            console.log('finished fetching');
            if (hospitals.length) {
              console.log(hospitals);
              setHospitals(hospitals);
              schedulePushNotification(hospitals);
              setStarted(false);
            } else refresh();
          })
          .catch((error: any) => refresh());
      }, Constants.manifest.extra.waitInSecondsBeforeRetry * 1000);
    }
  }

  useEffect(() => {
    // registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log(response);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);

  return (
    <View style={styles.container}>
      <Image
        style={styles.logo}
        source={{uri: 'https://www.old.korona.gov.sk/img/logo_nczi_clear.png'}}/>

        <Text>Running {count} time</Text>

      <View
        style={{
          flexDirection: "row",
          // padding: 20
        }}
      >
        <View style={{ flex: 0.5, padding: 8}} >
          <Text>{'Foreground task'}</Text>
          <Switch
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={started ? "#f5dd4b" : "#f4f3f4"}
            ios_backgroundColor="#3e3e3e"
            onValueChange={toggleFrontTask}
            value={started}
          />
        </View>
        <View style={{  flex: 0.5, padding: 8 }} >
          <Text>{'Background task'}</Text>
          <Switch
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={bgTaskEnabled ? "#f5dd4b" : "#f4f3f4"}
            ios_backgroundColor="#3e3e3e"
            onValueChange={toggleBackgroundTask}
            value={bgTaskEnabled}
          />
        </View>
      </View>
      <View
        style={{
          flexDirection: "row",
          // padding: 20
        }}
      >
      </View>
    </View>
  );
}

async function schedulePushNotification(hospitals: Array<Hospital>) {
  console.log('scheduling notification');
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Voľné miesto na očkovanie!!!",
      body: hospitals.map((hospital: Hospital) => hospital.title).join(),
      data: {data: hospitals},
      vibrate: [0, 250, 250, 250],
    },
    trigger: {seconds: 1},
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 152,
    height: 59,
  },
});

const BACKGROUND_FETCH_TASK = "BACKGROUND_FETCH_TASK";
async function registerBackgroudTask() {
  try {
    if (!TaskManager.isTaskDefined(BACKGROUND_FETCH_TASK)) {
      TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
        console.log(BACKGROUND_FETCH_TASK, "running");
        console.log('fetching', Constants.manifest.extra.url);
        const hospitals = await ockovanie(Constants.manifest.extra.url, Constants.manifest.extra.cities.split(','));
        console.log(hospitals);
        if (hospitals.length) {
          await schedulePushNotification(hospitals);
        }
        return BackgroundFetch.Result.NewData;
      });
    }
    console.log("registerBackgroundFetchAsync");
    BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: 15,
      startOnBoot: false,
      stopOnTerminate: false
    });
  } catch (err) {
    console.log("registerBackgroundFetchAsync() failed:", err);
  }
}
