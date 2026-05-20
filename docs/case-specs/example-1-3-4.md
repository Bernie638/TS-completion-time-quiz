We will be writing a program to randomly generate a multiple-choice quiz question on the rules governing Completion Times in the Generic Westinghouse Standard Technical Specifications (TS) (NUREG 1431 volume 1 Rev 5).  This must be in a format accessible through PowerPoint, Articulate Storyline, and Web such as a HTML/CSS/JS package.  The question will allow the learner to cycle between the question/choices and the given TS Limiting Condition for Operation (LCO). 
This will start with a dashboard allowing the learner to pick one or more examples to be tested including a button for “select all”.  

There are eight examples, 1.3-1 through 1.3-8.  For each of these examples I will have one or more “case”.  The quiz program will randomly pick an example (of the ones the user selected), then randomly pick a case from those provided under the example.
For each case I have a template stem that must be populated with random times within certain limits.  Then the correct answer will be randomly selected to be in one of the four choices (A, B, C, or D).  The correct answer will be calculated based on the random information in the stem.  The distractors will be selected to be in time order from earliest to latest and will be calculated based the rules I provide using the randomly generated values in the stem.  Example:  The correct answer location is randomly selected in position B, the program will choose one distractor rule that will produce a time earlier than the correct answer and two that will produce a time later than the correct answer.  

The program will show the stem and answer choices.  The learner will select a choice and then push a “submit” button.  This will also allow the learner to use tabs to cycle between the question, the reference Tech Spec, and LCO 3.0.3 (in a later version LCO 3.0.3 will be memory level, but for now we are using generic Tech Specs).

After submitting an answer the program will visually show the correct answer and if the learner was correct or incorrect.  After submitting a choice, the program will add a way for the learner to cycle back to the question and an answer explanation explain why the correct answer was correct, and (if they got the question wrong) why their choice was incorrect.
The program will also add a button for “New question” which will restart the random generation of the example, case, correct answer location, stem values, and distractor rules.
All generated answer times shall include the correct calendar date after applying the time offset.
Example: January 1 at 2200 + 36 hours = January 3 at 1000.
The program shall not display duplicate answer choices. If a selected distractor produces the same value as another displayed choice or the correct answer, another distractor rule shall be selected.
Time generation rules:
• Entry time shall be randomly selected from whole-hour values 0000 through 2300. 
• Times shall be displayed in four-digit 24-hour format. 
• Dates shall be displayed as Month Day, for example “January 2 at 0500.” 
• Date rollover shall be calculated from January 1.


Generic TS 1.3.4 examples:

(case 1 two valves, first repaired first)
Given:
• At time 0100 (always start first inoperability at 0100 to minimize the possibility of needing to add dates) Valve V1 is declared INOPERABLE
• At time 0200 (random time between 1-3 hours plus first valve time (must be <4 hours for this example)) Valve V2 is declared INOPERABLE
• At time 0300 (V1 time plus completion time minus 1) Valve V1 is restored to OPERABLE status
Using any applicable extensions, what is the latest time the plant is required to be in MODE 4?

A. 1300 (starting timer for B.2 at time of first inoperability)
B. 1400 (Starting the timer for B.2 at the second valve inoperability)
C. 1700 (starting timer for B.2 without using extension)
D. 1800 (correct answer)
E. 1900 (sequential timing of B.1 and B.2 off first valve inoperability)
F. 2000 (sequential timing of B.1 and B.2 off second valve inoperability)
G. 2400 (sequential timing of B.1 and B.2 off second valve as extended)
This allows the correct answer to be in any position, and have the correct answer and distractor times to be ordered by time. 

(case 2 two valves, second repaired first)
Given:
• At time 0100 (always start first inoperability at 0100 to minimize the possibility of needing to add dates) Valve V1 is declared INOPERABLE
• At time 0200 (random time between 1-3 hours plus first valve time (must be <4 hours for this example)) Valve V2 is declared INOPERABLE
• At time 0300 (V1 time plus completion time minus 1) Valve V2 is restored to OPERABLE status
Using any applicable extensions, what is the latest time the plant is required to be in MODE 4?

A. 1300 (starting timer for B.2 at time of first inoperability)
B. 1400 (Starting the timer for B.2 at the second valve inoperability)
C. 1500 (Starting the timer for B.2 at the second valve restored)
D. 1700 (correct answer)
E. 1800 (restarted condition A timer when second valve failed)
F. 1900 (sequential timing of B.1 and B.2 off first valve inoperability
G. 1900 (restarting condition A when valve 2 repaired)
H. 2000 (sequential timing of B.1 and B.2 off second valve inoperability)
I. 2400 (sequential B.1 and B.2 after condition A)

This allows the correct answer to be in any position, and have the correct answer and distractor times to be ordered by time.
(case 3 two valves, first repaired before second inoperability)
Given:
• At time 0100 (always start first inoperability at 0100 to minimize the possibility of needing to add dates) Valve V1 is declared INOPERABLE
• At time 0200 (random time between 1-2 hours plus first valve time (must be <3 hours for this example)) Valve V1 is restored to OPERABLE status
• At time 0300 (V1 time plus completion time minus 1) Valve V2 is declared INOPERABLE status
Using any applicable extensions, what is the latest time the plant is required to be in MODE 4?

A. 1300 (starting timer for B.2 at time of first inoperability)
B. 1400 (Starting the timer for B.2 at the first valve restored to operability time)
C. 1500 (starting timer for B.2 at time of second inoperability)
D. 1700 (continuing in the LCO start time for V1 inoperability)
E. 1900 (correct answer)
F. 2100 (applying the four-hour extension to the second valve LCO entry)
G. 2100 (starting B.1 and B.2 sequentially off second valve inoperability)
H. 2300 (sequentially applying B.1 and B.2 after condition A time expired from valve V1)
I. 2300 (applying the four-hour extension to the second valve inoperability)
J. 2400 (sequential timing of B.1 and B.2 off first valve restored)
K. 0100 the following day (sequential B.1 and B.2 after condition A)
This allows the correct answer to be in any position and have the correct answer and distractor times to be ordered by time. 

Now we can modify the example LCO (1.3-4) for the condition A completion time to be 72 hours so we can test the 24 hour extension time limit.



(case 4 two valves, first repaired first, <24 hours difference in inoperability time)
Given:
• On 1 January at time 0100 (always start first inoperability at 0100 to minimize the possibility of needing to add dates) Valve V1 is declared INOPERABLE
• On 1 January at time 1000 (random time between 1-23 hours plus first valve time (must be <24 hours for this example)) Valve V2 is declared INOPERABLE
• On 1 January at 1200 (V1 time random number of hours but MUST be after V2 INOP AND < V1 INOP+24 hours) Valve V1 is restored to OPERABLE status
Using any applicable extensions, what is the latest time the plant is required to be in MODE 4?

A. 1 January 1300 (starting timer for B.2 at time of first inoperability)
B. 1 January 2200 (Starting the timer for B.2 at the second valve inoperability)
C. 1 January 1900 (B.1 and B.2 sequentially at time of first valve inoperability)
D. 2 January 1400 (B.1 and B.2 sequentially at time of second valve inoperability)
E. 4 January 0100 (completion time for just condition A for Valve 1)
F. 4 January 1000 (completion time for just condition A for Valve 2)
G. 4 January 1900 (original time for just valve V1)
H. 4 January 2200 (correct answer, time from the LCO for second valve is more limiting than the extension time applied to Valve V1)
I. 5 January 1300 (using the 24-hour extension to the first valve inoperability)
J. 5 January 0200 (first valve inoperability plus sequentially B.1 and B.2 after condition A completion)
K. 5 January 1900 (adding 24 hour extension the first valve completion time)
L. 5 January 1000 (using the 24-hour extension to the second valve completion time)
M. 7 January 1900 (adding a 72 hour extension to the first valve completion time)
N. 8 January 0400 (adding a 72 hour extension to the second valve completion time)



(case 5 two valves, first repaired first, >24 hours difference in inoperability time)
Given:
• On 1 January at time 0100 (always start first inoperability at 0100 to minimize the possibility of needing to add dates) Valve V1 is declared INOPERABLE
• On 2 January at time 1100 (random time between 25-70 hours plus first valve time (must be >24 hours but <48 for this example)) Valve V2 is declared INOPERABLE
• On 2 January at 1200 (V1 time random number of hours but MUST be after V2 INOP AND > V1 INOP+24 hours) Valve V1 is restored to OPERABLE status
Using any applicable extensions, what is the latest time the plant is required to be in MODE 4?

A. 1 January 1300 (starting timer for B.2 at time of first inoperability)
B. 1 January 1900 (B.1 and B.2 sequentially at time of first valve inoperability)
C. 2 January 2300 (Starting the timer for B.2 at the second valve inoperability)
D. 2 January 0500 (B.1 and B.2 sequentially at time of second valve inoperability)
E. 4 January 0100 (completion time for just condition A for Valve 1)
F. 4 January 1100 (completion time for just condition A for Valve 2)
G. 4 January 1900 (original time for just valve V1)
H. 5 January 0100 (using the 24-hour extension to the first valve inoperability)
I. 5 January 0200 (first valve inoperability plus sequentially B.1 and B.2 after condition A completion)
J. 5 January 1900 (adding 24 hour extension the first valve completion time)
K. 6 January 0500 (correct answer, time from the LCO for second valve)
L. 7 January 0500 (using the 24-hour extension to the second valve completion time)
M. 7 January 1900 (adding a 72 hour extension to the first valve completion time)
N. 8 January 0400 (adding a 72 hour extension to the second valve completion time)


