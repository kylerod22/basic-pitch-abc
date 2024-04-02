import React, { useState } from 'react';
import logo from './logo.svg';
import './App.css';
import abcjs from "abcjs";
import { BasicPitch,  addPitchBendsToNoteEvents,
  noteFramesToTime,
  outputToNotesPoly, } from '@spotify/basic-pitch'; // Import the library

const Notes = ["C", "^C", "D", "^D", "E", "F", "^F", "G", "^G", "A", "^A", "B"];
const BPMinute = 120;
const BPMeasure = 4;
const unitBeat = 4;

let sampleTimeSeconds = (BPMeasure * 60.0) / BPMinute;

let unitDurationSeconds = sampleTimeSeconds / BPMeasure;
let halfDuration = unitDurationSeconds / 2;
let quarterDuration = halfDuration / 2;
let doubleDuration = unitDurationSeconds * 2;
let quadDuration = doubleDuration * 2;

let Durations = {
  quarterDuration: "/4",
  halfDuration: "/2",
  unitDurationSeconds: "",
  doubleDuration: "2",
  quadDuration: "4"
};

const App = () => {
  //abcjs.renderAbc("paper", "X:1\nK:D\nDDAABBA\n");
  abcjs.renderAbc("paper", "X:1\nK:C\nD");
  console.log(sampleTimeSeconds);
  const [isRecording, setIsRecording] = useState(false);
  const toggleRecording = async () => {
    try {
      setIsRecording(prevState => !prevState); // Toggle recording state

      if (!isRecording) {
        // Start recording
        console.log("Starting recording!");
        const audioBuffer = await fetchAudioData();
        console.log('Recording stopped, audio buffer:', audioBuffer);
        const basicPitch = new BasicPitch("https://unpkg.com/@spotify/basic-pitch@1.0.1/model/model.json");

        const frames = [];
        const onsets = [];
        const contours = [];


        /*await basicPitch.evaluateModel(audioBuffer, (frames, onsets, contours) => {
          // Process the pitch detection results
          const notes = processPitchDetectionResults(frames, onsets, contours); // Implement this function
          setDetectedNotes(notes); // Update state with detected notes
          console.log(notes);
        }, (percent) => {
          console.log('Processing progress:', percent);
        }); */

        await basicPitch.evaluateModel(
          audioBuffer,
          (f, o, c) => {
            frames.push(...f);
            onsets.push(...o);
            contours.push(...c);
          },
          (p) => {
            console.log("Progress: ", p);
          }
        );

        let notes = noteFramesToTime(
          addPitchBendsToNoteEvents(
            contours,
            outputToNotesPoly(frames, onsets, 0.63, 0.5, 15)
          )
        );
        
        displayNotes(notes);
        

        console.log('Pitch detection complete, detected notes:', notes);

      } else {
        // Stop recording
        console.log('Recording stopped');
      }
    } catch (error) {
      console.error('Error toggling recording:', error);
    }
  };

  const displayNotes = (notes) => {
    let noteString = "X:1\nT:Notation Nation!!\nK:C\n";
    noteString = noteString.concat("M:", BPMeasure, "/", unitBeat, "\n");
    notes = notes.sort(function(note1, note2) {
      return note1.startTimeSeconds > note2.startTimeSeconds ? 1 : note1.startTimeSeconds < note2.startTimeSeconds ? -1 : 0;
    });
    notes.forEach((note) => {
      const baseNote = Notes[note.pitchMidi % 12];
      if (baseNote)


      //console.log(baseNote);
      noteString = noteString.concat(baseNote);
    });
    console.log(noteString);
    abcjs.renderAbc("paper", noteString);
  }



  const fetchAudioData = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
  
      // Start recording
      const audioBuffer = await recordAudio(source, audioContext);
  
      // Resample audio buffer if necessary
      if (audioBuffer.sampleRate !== 22050) {
        const resampledBuffer = await resampleAudioBuffer(audioBuffer, 22050);
        return resampledBuffer;
      }
  
      return audioBuffer;
    } catch (error) {
      console.error('Error capturing audio:', error);
      throw error;
    }
  };

  const recordAudio = (source, audioContext) => {
    return new Promise((resolve, reject) => {
      const bufferSize = 2048;
      const scriptNode = audioContext.createScriptProcessor(bufferSize, 1, 1);
  
      let audioData = [];
  
      scriptNode.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        const outputData = new Float32Array(inputData);
        audioData.push(outputData);
      };
  
      source.connect(scriptNode);
      scriptNode.connect(audioContext.destination);
  
      setTimeout(() => {
        scriptNode.disconnect();
        source.disconnect();
  
        const audioBuffer = audioContext.createBuffer(1, audioData.length * bufferSize, audioContext.sampleRate);
        const channelData = audioBuffer.getChannelData(0);
  
        for (let i = 0; i < audioData.length; i++) {
          channelData.set(audioData[i], i * bufferSize);
        }
  
        resolve(audioBuffer);
      //}, sampleTimeSeconds * 1000); // Adjust the duration as needed
      }, 5000); // Adjust the duration as needed
    });
  };

  const resampleAudioBuffer = async (audioBuffer, targetSampleRate) => {
    const audioContext = new OfflineAudioContext(
      audioBuffer.numberOfChannels,
      audioBuffer.length,
      targetSampleRate
    );
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start();
    const resampledBuffer = await audioContext.startRendering();
    return resampledBuffer;
  };

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>Hello World!</p>
        <button onClick={toggleRecording}>
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
};

export default App;
